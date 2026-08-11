const { app, BrowserWindow, Menu } = require("electron");
const path = require("node:path");

const APP_URL = "https://neytrino2134.github.io/Prompt-Modifier/";
const ALLOWED_ORIGIN = "https://neytrino2134.github.io";
const ALLOWED_PATH_PREFIX = "/Prompt-Modifier";

function isAllowedUrl(candidate) {
  try {
    const url = new URL(candidate);
    return url.origin === ALLOWED_ORIGIN && url.pathname.startsWith(ALLOWED_PATH_PREFIX);
  } catch {
    return false;
  }
}

function getIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "icon.ico")
    : path.join(__dirname, "icon.ico");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#101114",
    icon: getIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) {
      win.loadURL(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
    }
  });

  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
