/**
 * NativeBridge Service
 * 
 * This service detects if the app is running within a native wrapper (like Capacitor or Cordova).
 * It provides a unified interface for gathering local media, whether from a browser picker
 * or a native mobile file system.
 */

export interface NativeMediaFile {
  name: string;
  path: string; // The physical path on the device
  size: number;
  type: string;
  lastModified: number;
  blob?: Blob; // Available if browser-based
}

class NativeBridgeService {
  /**
   * Detects if we are running inside a native mobile wrapper (Capacitor/WebView)
   */
  isNative(): boolean {
    return (window as any).Capacitor?.isNative || (window as any).isNativeWrapper === true;
  }

  /**
   * Triggers the "VLC-style" library scan.
   * On Web: Uses standard picker.
   * On Mobile: Requests 'Media Library' permissions and returns file metadata.
   */
  async requestMediaAccess(): Promise<NativeMediaFile[]> {
    if (this.isNative()) {
      // In a real Capacitor app, this would call: 
      // const { files } = await Capacitor.Plugins.MediaScanner.getMediaFiles();
      console.log("[NativeBridge] Requesting native filesystem permissions...");
      
      // Placeholder for the native side to hook into
      if ((window as any).NativeBridge?.getMedia) {
        return await (window as any).NativeBridge.getMedia();
      }
      
      throw new Error("Native Bridge detected but Media Plugin not initialized.");
    }

    // Fallback: This is what we currently do in the browser
    return [];
  }

  /**
   * Formats a local path into a playable source
   */
  getFileUrl(file: NativeMediaFile): string {
    if (file.blob) return URL.createObjectURL(file.blob);
    
    // In a native app, this would be: 
    // return Capacitor.convertFileSrc(file.path);
    return file.path;
  }
}

export const NativeBridge = new NativeBridgeService();
