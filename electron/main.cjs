// The desktop app.
//
// The interface is loaded from files inside the bundle rather than over the
// network, so it opens instantly and works with no connection. Writing new
// questions still calls the deployment, because that is where the model key
// lives and it must never be shipped to a user's machine.

const { app, BrowserWindow, shell, Menu, session } = require("electron");
const path = require("node:path");

const SITE = process.env.DWIDDLE_SITE || "https://dwiddle.vercel.app";
const dev = !app.isPackaged;

let win = null;

function create() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: "Dwiddle",
    backgroundColor: "#ffffff",
    // A title bar that blends into the app rather than sitting on top of it.
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      // The renderer is a website. It gets no access to Node, and runs in its
      // own context, so a flaw in a dependency cannot reach the file system.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  if (dev && !process.env.DWIDDLE_FORCE_FILE) {
    win.loadURL(process.env.DWIDDLE_DEV_URL || "http://localhost:5180");
  } else {
    win.loadFile(path.join(__dirname, "../dist-desktop/index.html"));
  }

  // A link to somewhere else belongs in the real browser, not in a window with
  // no address bar where nobody can see where they have been taken.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    const here = win.webContents.getURL();
    if (new URL(url).origin !== new URL(here).origin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.on("closed", () => { win = null; });
}

// On the web the policy arrives as a header from the host. Pages loaded from
// disk have no host, so the same protection is applied here instead.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' ${SITE} https://*.supabase.co wss://*.supabase.co`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, done) => {
    done({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [CSP] } });
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(menu()));
  create();

  // On a Mac, closing the last window does not quit, and clicking the dock
  // icon opens a new one.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) create();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function menu() {
  const mac = process.platform === "darwin";
  return [
    ...(mac ? [{ role: "appMenu" }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "Open Dwiddle on the web", click: () => shell.openExternal(SITE) },
        { label: "Privacy", click: () => shell.openExternal(`${SITE}/privacy`) },
        { label: "Terms", click: () => shell.openExternal(`${SITE}/terms`) },
      ],
    },
  ];
}
