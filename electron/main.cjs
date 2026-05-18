// Sweety Desktop — Electron main process
const { app, BrowserWindow, ipcMain, shell, clipboard, Notification, dialog } = require("electron");
const path = require("path");
const { exec, spawn } = require("child_process");
const os = require("os");
const fs = require("fs");

const isDev = !!process.env.SWEETY_DEV_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: "#0a0a0f",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL(process.env.SWEETY_DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // Open external links in user's browser, not inside Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---------------- IPC: Desktop Powers ----------------

// Run a shell command with a 15s timeout
ipcMain.handle("sweety:exec", async (_evt, command) => {
  if (typeof command !== "string" || !command.trim()) {
    return { ok: false, error: "Empty command" };
  }
  return new Promise((resolve) => {
    exec(command, { timeout: 15000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, error: err.message, stdout, stderr });
      resolve({ ok: true, stdout, stderr });
    });
  });
});

// Open URL in default browser
ipcMain.handle("sweety:openExternal", async (_evt, url) => {
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Launch a native app by name (cross-platform best-effort)
ipcMain.handle("sweety:openApp", async (_evt, appName) => {
  if (!appName) return { ok: false, error: "No app name" };
  try {
    const platform = process.platform;
    let cmd;
    if (platform === "win32") cmd = `start "" "${appName}"`;
    else if (platform === "darwin") cmd = `open -a "${appName}"`;
    else cmd = `${appName} &`;
    spawn(cmd, { shell: true, detached: true, stdio: "ignore" }).unref();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Clipboard
ipcMain.handle("sweety:clipboardRead", () => clipboard.readText());
ipcMain.handle("sweety:clipboardWrite", (_evt, text) => {
  clipboard.writeText(String(text ?? ""));
  return { ok: true };
});

// Native notification
ipcMain.handle("sweety:notify", (_evt, { title, body }) => {
  if (!Notification.isSupported()) return { ok: false, error: "Not supported" };
  new Notification({ title: title || "Sweety", body: body || "" }).show();
  return { ok: true };
});

// System info
ipcMain.handle("sweety:systemInfo", () => ({
  platform: process.platform,
  arch: process.arch,
  hostname: os.hostname(),
  username: os.userInfo().username,
  totalMemGB: +(os.totalmem() / 1024 ** 3).toFixed(1),
  freeMemGB: +(os.freemem() / 1024 ** 3).toFixed(1),
  uptimeHrs: +(os.uptime() / 3600).toFixed(1),
  cpus: os.cpus().length,
  cpuModel: os.cpus()[0]?.model ?? "unknown",
}));

// Read a text file (with confirmation dialog for safety)
ipcMain.handle("sweety:readFile", async (_evt, filePath) => {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Pick a file via dialog
ipcMain.handle("sweety:pickFile", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openFile"] });
  if (result.canceled) return { ok: false, error: "Cancelled" };
  return { ok: true, path: result.filePaths[0] };
});
