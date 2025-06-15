// main/preload.ts
import { contextBridge, ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendCaptureRect: (rect: any, screenshotPath: string) => {
    ipcRenderer.send('capture-rect', rect, screenshotPath);
  },
  closeCaptureWindow: () => {
    ipcRenderer.send('close-capture-window');
  },
  onScreenshotBase64: (callback: (base64: string) => void) => {
    ipcRenderer.on('screenshot-base64', (_event, base64: string) => {
      callback(base64);
      console.log("send from preload")
    });
  },
  ipcRendererReady: () =>{
    ipcRenderer.send('main-window-ready');
  },
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  openExternal: () => ipcRenderer.send('open-external'),
});