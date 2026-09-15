// The desktop app.
//
// The interface is loaded from files inside the bundle rather than over the
// network, so it opens instantly and works with no connection. Writing new
// questions still calls the deployment, because that is where the model key
// lives and it must never be shipped to a user's machine.

const { app, BrowserWindow, shell, Menu, session, ipcMain, screen, dialog } = require("electron");
const fs = require("node:fs");
const updates = require("./update.cjs");
const uninstall = require("./uninstall.cjs");
const path = require("node:path");

const SITE = process.env.DWIDDLE_SITE || "https://dwiddle.vercel.app";
const dev = !app.isPackaged;

let win = null;
let pendingAuth = null;

// Sign in happens in the real browser, because Google refuses to authenticate
// inside an embedded window and it is right to. The link back therefore has to
// reach the app, which it does through a scheme the app owns.
app.setAsDefaultProtocolClient("dwiddle");

function handleAuth(url) {
  if (!url || !url.startsWith("dwiddle://")) return;
  if (win) {
    win.webContents.send("dwiddle:auth", url);
    if (win.isMinimized()) win.restore();
    win.focus();
  } else {
    pendingAuth = url; // arrived before there was a window to give it to
  }
}

// Where the window was last time. Reopening at the default size in the middle
// of the screen every launch is the clearest sign an app is a web page.
const boundsFile = () => path.join(app.getPath("userData"), "window.json");

function lastBounds() {
  try {
    const saved = JSON.parse(fs.readFileSync(boundsFile(), "utf8"));
    // A monitor that has since been unplugged would put the window off screen.
    const area = screen.getDisplayMatching(saved).workArea;
    if (saved.x + saved.width < area.x || saved.x > area.x + area.width) return null;
    if (saved.y + saved.height < area.y || saved.y > area.y + area.height) return null;
    return saved;
  } catch {
    return null;
  }
}

function rememberBounds() {
  // Nothing is written back into a folder that is in the middle of being removed.
  if (uninstall.inProgress()) return;
  if (!win || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
  try {
    fs.writeFileSync(boundsFile(), JSON.stringify(win.getNormalBounds()));
  } catch {
    // Not being able to remember the size is not worth interrupting anyone for.
  }
}

function create() {
  const mac = process.platform === "darwin";
  const saved = lastBounds();

  win = new BrowserWindow({
    ...(saved || { width: 1280, height: 860 }),
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: "Dwiddle",
    // On a Mac the window is translucent and the desktop shows through the
    // sidebar, the way Mail and Notes look. Everywhere else it stays solid.
    ...(mac
      ? { vibrancy: "sidebar", visualEffectState: "active", backgroundColor: "#00000000" }
      : { backgroundColor: "#ffffff" }),
    // A title bar that blends into the app rather than sitting on top of it.
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      // The renderer is a website. It gets no access to Node, and runs in its
      // own context, so a flaw in a dependency cannot reach the file system.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // A sandboxed preload cannot ask the app its version, so it is handed
      // over on the command line instead.
      additionalArguments: [`--dwiddle-version=${app.getVersion()}`],
    },
  });

  win.once("ready-to-show", () => win.show());

  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(rememberBounds, 400);
  };
  win.on("resize", scheduleSave);
  win.on("move", scheduleSave);
  win.on("close", rememberBounds);

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

  win.webContents.once("did-finish-load", () => {
    if (pendingAuth) { win.webContents.send("dwiddle:auth", pendingAuth); pendingAuth = null; }
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

// A Mac app run from the disk image or the Downloads folder is not installed:
// it vanishes when the image is ejected and cannot update itself. So the first
// time it is opened from anywhere but Applications it offers to move itself
// there, which is the one step people forget after dragging it out.
//
// Saying no is remembered. Being asked on every launch is worse than never.
// Not Now is remembered for a fortnight rather than for ever.
//
// A quit that arrives while the question is on screen, from a logout say,
// makes macOS abort the alert, and to the app that is indistinguishable from
// someone dismissing it. Testing showed no reliable way to tell the two
// apart. So instead of trying, a wrong answer is made cheap: it expires, and
// the question comes back. The answer is also only written down once the app
// has kept running for a moment afterwards, which rules out the commonest
// case, an app that was on its way out anyway.
const ASK_AGAIN_AFTER = 14 * 24 * 60 * 60 * 1000;
let quitting = false;
app.on("before-quit", () => { quitting = true; });

async function offerToMoveMac() {
  if (process.platform !== "darwin" || !app.isPackaged || app.isInApplicationsFolder()) return;
  const declined = path.join(app.getPath("userData"), "move-declined");
  try {
    const when = Number(fs.readFileSync(declined, "utf8"));
    if (when && Date.now() - when < ASK_AGAIN_AFTER) return;
  } catch {
    // Never declined, or the note is unreadable: either way, ask.
  }

  const { response } = await dialog.showMessageBox({
    type: "question",
    message: "Move Dwiddle to Applications?",
    detail: "It is running from where it was downloaded. In Applications it stays put when the download is cleared, and it can keep itself up to date.",
    buttons: ["Move to Applications", "Not Now"],
    defaultId: 0,
    cancelId: 1,
  });

  if (quitting) return;
  if (response !== 0) {
    setTimeout(() => {
      if (quitting) return;
      try { fs.mkdirSync(path.dirname(declined), { recursive: true }); fs.writeFileSync(declined, String(Date.now())); } catch {}
    }, 2000);
    return;
  }

  try {
    // Replaces an older copy already in Applications. If that copy is open
    // right now it is left alone, and the person is told why.
    app.moveToApplicationsFolder({
      conflictHandler: (kind) => {
        if (kind === "existsAndRunning") {
          dialog.showMessageBoxSync({
            type: "warning",
            message: "Dwiddle is already open from Applications",
            detail: "Quit that copy, then open this one again to move it.",
          });
          return false;
        }
        return true;
      },
    });
  } catch (err) {
    dialog.showMessageBoxSync({
      type: "warning",
      message: "Dwiddle could not move itself",
      detail: "Drag it into the Applications folder in Finder instead.",
    });
  }
}

app.whenReady().then(async () => {
  await offerToMoveMac();
  if (quitting) { app.exit(0); return; }

  session.defaultSession.webRequest.onHeadersReceived((details, done) => {
    done({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [CSP] } });
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(menu()));
  create();

  // Give the window a moment to settle before doing anything over the network.
  setTimeout(() => updates.start(), 4000);
  ipcMain.handle("dwiddle:install-update", () => updates.quitAndInstall());
  ipcMain.handle("dwiddle:uninstall-plan", () => uninstall.plan());
  ipcMain.handle("dwiddle:uninstall", (event, phrase) =>
    uninstall.run(BrowserWindow.fromWebContents(event.sender), phrase));

  // On a Mac, closing the last window does not quit, and clicking the dock
  // icon opens a new one.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) create();
  });
});

// macOS delivers the link as an event. Windows and Linux relaunch the app with
// it on the command line, which the single instance lock turns into an event.
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleAuth(url);
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (event, argv) => {
    handleAuth(argv.find((a) => a.startsWith("dwiddle://")));
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

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
