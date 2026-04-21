/**
 * IndexedDB utility for storing FileSystemFileHandles.
 * Handles are serializable and can be stored in IDB to persist across sessions.
 */

const DB_NAME = 'FilmSortHandles';
const STORE_NAME = 'handles';
const DB_VERSION = 1;

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveHandle(id: string, handle: FileSystemFileHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getHandle(id: string): Promise<FileSystemFileHandle | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function deleteHandle(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearHandles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Checks if we have read permission for a handle.
 */
export async function verifyPermission(handle: FileSystemFileHandle, withRequest = false): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = { mode: 'read' };
  
  // Check if we already have permission
  if ((await (handle as any).queryPermission(options)) === 'granted') {
    return true;
  }
  
  // Request permission
  if (withRequest) {
    if ((await (handle as any).requestPermission(options)) === 'granted') {
      return true;
    }
  }
  
  return false;
}
