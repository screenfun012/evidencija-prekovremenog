import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("storageApi", {
  get: (key: string) => ipcRenderer.invoke("store-get", key),
  set: (key: string, value: string) => ipcRenderer.invoke("store-set", key, value),
});
