// Keeping the app current.
//
// Windows can do this properly: the update downloads in the background and
// installs when the app is next closed. macOS cannot, and it is worth being
// precise about why. Squirrel.Mac verifies the code signature of an update
// before swapping it in, and these builds are unsigned, so an automatic
// install would be rejected. Rather than fail quietly, the Mac build checks
// the same releases feed and offers the download.

const { app, BrowserWindow, dialog, shell } = require("electron");

const REPO = "https://api.github.com/repos/pachdono/dwiddle-releases/releases/latest";
const PAGE = "https://github.com/pachdono/dwiddle-releases/releases/latest";

// Compares 1.0.10 against 1.0.9 as numbers rather than as text, where "9"
// sorts after "10" and the update would never be offered.
function newer(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function send(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload);
}

async function checkMac() {
  try {
    const reply = await fetch(REPO, { headers: { Accept: "application/vnd.github+json" } });
    if (!reply.ok) return;
    const data = await reply.json();
    const latest = String(data.tag_name || "").replace(/^v/, "");
    if (!latest || !newer(latest, app.getVersion())) return;

    send("dwiddle:update", { state: "available", version: latest, manual: true });

    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update available",
      message: `Dwiddle ${latest} is out.`,
      detail:
        "These builds are not code signed, which is what would let the app replace itself. " +
        "Download the new version and drag it into Applications over the old one.",
    });
    if (response === 0) shell.openExternal(PAGE);
  } catch {
    // An update check failing is not worth telling anybody about.
  }
}

function startWindows() {
  const { autoUpdater } = require("electron-updater");
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) =>
    send("dwiddle:update", { state: "downloading", version: info.version }));
  autoUpdater.on("download-progress", (p) =>
    send("dwiddle:update", { state: "downloading", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (info) =>
    send("dwiddle:update", { state: "ready", version: info.version }));
  autoUpdater.on("error", () => {});

  autoUpdater.checkForUpdates().catch(() => {});
  // Once a day is plenty for something somebody leaves open for weeks.
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 24 * 60 * 60 * 1000);
}

function quitAndInstall() {
  try {
    require("electron-updater").autoUpdater.quitAndInstall();
  } catch {
    shell.openExternal(PAGE);
  }
}

function start() {
  if (!app.isPackaged) return; // a dev build has no release to compare against
  if (process.platform === "win32") startWindows();
  else {
    checkMac();
    setInterval(checkMac, 24 * 60 * 60 * 1000);
  }
}

module.exports = { start, quitAndInstall };
