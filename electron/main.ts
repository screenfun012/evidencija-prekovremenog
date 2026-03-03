import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import Store from "electron-store";

const store = new Store() as unknown as { get(key: string): unknown; set(key: string, value: string): void };

ipcMain.handle("store-get", (_event, key: string) => {
  const val = store.get(key);
  return val !== undefined ? String(val) : undefined;
});

ipcMain.handle("store-set", (_event, key: string, value: string) => {
  store.set(key, value);
});

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === "development" || process.argv.includes("--dev")) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
