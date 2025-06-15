/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vite/client" />
export {}
export interface IElectronAPI {
  sendCaptureRect: (rect: any, screenshotPath: string) => void;
  closeCaptureWindow: () => void;
  onScreenshotBase64: (callback: (base64: string) => void) => void;
  ipcRendererReady: () => void;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openExternal: () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}