// Sweety Desktop — Preload bridge (safe IPC surface)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sweetyDesktop", {
  isDesktop: true,
  version: "1.0.0",
  exec: (command) => ipcRenderer.invoke("sweety:exec", command),
  openExternal: (url) => ipcRenderer.invoke("sweety:openExternal", url),
  openApp: (appName) => ipcRenderer.invoke("sweety:openApp", appName),
  clipboardRead: () => ipcRenderer.invoke("sweety:clipboardRead"),
  clipboardWrite: (text) => ipcRenderer.invoke("sweety:clipboardWrite", text),
  notify: (title, body) => ipcRenderer.invoke("sweety:notify", { title, body }),
  systemInfo: () => ipcRenderer.invoke("sweety:systemInfo"),
  readFile: (path) => ipcRenderer.invoke("sweety:readFile", path),
  pickFile: () => ipcRenderer.invoke("sweety:pickFile"),
});
