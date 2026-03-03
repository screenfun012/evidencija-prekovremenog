"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("storageApi", {
    get: (key) => electron_1.ipcRenderer.invoke("store-get", key),
    set: (key, value) => electron_1.ipcRenderer.invoke("store-set", key, value),
});
