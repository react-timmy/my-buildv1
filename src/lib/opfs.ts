/**
 * Origin Private File System (OPFS) utility for persistent local storage.
 * Files stored here are accessible after page reloads WITHOUT user intervention.
 */

export interface VaultFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  handle: FileSystemFileHandle;
}

/**
 * Lists all files currently stored in the OPFS Vault.
 */
export async function getVaultFiles(): Promise<VaultFile[]> {
  try {
    const root = await navigator.storage.getDirectory();
    const files: VaultFile[] = [];
    
    // @ts-ignore - values() is part of FileSystemDirectoryHandle
    for await (const entry of root.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        files.push({
          name: entry.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          handle: fileHandle,
        });
      }
    }
    
    return files.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('Failed to read OPFS:', error);
    return [];
  }
}

/**
 * Saves a File object into the OPFS Vault.
 */
export async function saveFileToVault(file: File): Promise<VaultFile> {
  const root = await navigator.storage.getDirectory();
  
  // Create a writable stream to the file in OPFS
  const fileHandle = await root.getFileHandle(file.name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  
  const savedFile = await fileHandle.getFile();
  return {
    name: file.name,
    size: savedFile.size,
    type: savedFile.type,
    lastModified: savedFile.lastModified,
    handle: fileHandle,
  };
}

/**
 * Removes a file from the OPFS Vault by name.
 */
export async function deleteFileFromVault(name: string): Promise<void> {
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(name);
}

/**
 * Retrieves the actual File/Blob from an OPFS handle.
 */
export async function getFileBlob(handle: FileSystemFileHandle): Promise<Blob> {
  return await handle.getFile();
}

/**
 * Saves library metadata to a hidden file in OPFS.
 */
export async function saveMetadata(data: any): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle('.metadata.json', { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
  } catch (e) {
    console.error("Failed to save metadata to OPFS", e);
  }
}

/**
 * Loads library metadata from OPFS.
 */
export async function loadMetadata(): Promise<any | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle('.metadata.json');
    const file = await handle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (e) {
    // Expected if file doesn't exist yet
    return null;
  }
}

/**
 * Internal system stats for the dashboard.
 */
export async function getVaultStats() {
    const root = await navigator.storage.getDirectory();
    let totalSize = 0;
    let fileCount = 0;

    // @ts-ignore
    for await (const entry of root.values()) {
        if (entry.kind === 'file') {
            try {
                const file = await (entry as FileSystemFileHandle).getFile();
                totalSize += file.size;
                fileCount++;
            } catch (e) {
                console.warn(`Failed to read file size for stat calculation: ${entry.name}`, e);
            }
        }
    }
    
    // Provide fallback quota if estimate is unavailable
    let quota = 0;
    try {
        const estimate = await navigator.storage.estimate();
        quota = estimate.quota || 0;
    } catch(e) {
        console.error("Storage estimate unavailable", e);
    }

    // Default to a reasonable size if no quota is reported to avoid division by zero
    return {
        used: totalSize,
        quota: quota > 0 ? quota : 1, 
        count: fileCount
    };
}
