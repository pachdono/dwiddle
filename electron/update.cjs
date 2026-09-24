// Keeping the app current.
//
// Two settings decide how. With automatic updates on, a new version downloads
// in the background and goes in when the app is closed, and nobody is asked
// anything. With them off, the app says a version is out when it opens, and
// only fetches it if the person says yes.
//
// Either way, choosing Update now shows a full screen progress view, fetches
// the new version, puts it in place and reopens the app.
//
// Windows uses electron-updater, which does all of that properly. The Mac
// cannot: Squirrel.Mac checks the code signature of an update before swapping
// it in, and these builds are not signed by Apple, so it would refuse. So on a
// Mac this file does the same job itself. It downloads the disk image, checks
// it against the checksum published with the release, mounts it, and after
// the app has quit, copies the new app over the old one and opens it. A file
// the app downloads itself is not marked as quarantined, so the new copy opens
// without the warning a browser download gets. Where the app cannot write to
// its own folder, it opens the disk image for the person to drag in instead.

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn, execFile } = require("node:child_process");

const RELEASES = "https://github.com/pachdono/dwiddle-releases/releases";
const LATEST = "https://api.github.com/repos/pachdono/dwiddle-releases/releases/latest";
const DAY = 24 * 60 * 60 * 1000;

/* ---------- preferences ---------- */

const prefsFile = () => path.join(app.getPath("userData"), "update-prefs.json");

function prefs() {
  try { return { auto: true, ...JSON.parse(fs.readFileSync(prefsFile(), "utf8")) }; }
  catch { return { auto: true }; }
}

function setPrefs(next) {
  const merged = { ...prefs(), ...next };
  try {
    fs.mkdirSync(path.dirname(prefsFile()), { recursive: true });
    fs.writeFileSync(prefsFile(), JSON.stringify(merged));
  } catch {}
  return merged;
}

/* ---------- state, shared with the page ---------- */

// idle | available | downloading | ready | installing | error
let state = { state: "idle" };

function publish(next) {
  state = { ...state, ...next, auto: prefs().auto, platform: process.platform };
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send("dwiddle:update", state);
}

// Compares 1.0.10 against 1.0.9 as numbers rather than as text.
function newer(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

// For testing the whole path against a real release: an app told it is older
// than it is will find, fetch and install the current version.
const current = () => process.env.DWIDDLE_PRETEND_VERSION || app.getVersion();

const FAILED = "The update could not be downloaded. Check your connection and try again.";

/* ---------- Windows ---------- */

let updater = null;
let installAfterDownload = false;

function winSetup() {
  const { autoUpdater } = require("electron-updater");
  updater = autoUpdater;
  autoUpdater.autoDownload = prefs().auto;
  autoUpdater.autoInstallOnAppQuit = prefs().auto;

  autoUpdater.on("update-available", (info) => {
    publish({ state: prefs().auto ? "downloading" : "available", version: info.version, percent: 0 });
  });
  autoUpdater.on("download-progress", (p) => {
    publish({ state: installAfterDownload ? "installing" : "downloading", percent: Math.round(p.percent) });
  });
  autoUpdater.on("update-downloaded", (info) => {
    publish({ state: installAfterDownload ? "installing" : "ready", version: info.version, percent: 100 });
    if (installAfterDownload) setTimeout(() => autoUpdater.quitAndInstall(true, true), 900);
  });
  autoUpdater.on("error", () => {
    if (installAfterDownload || state.state === "installing") {
      installAfterDownload = false;
      publish({ state: "error", message: FAILED });
    }
  });
}

const winCheck = () => updater?.checkForUpdates().catch(() => {});

function winInstall() {
  installAfterDownload = true;
  if (state.state === "ready") {
    publish({ state: "installing", percent: 100 });
    setTimeout(() => updater.quitAndInstall(true, true), 900);
    return;
  }
  const already = state.state === "downloading";
  publish({ state: "installing", percent: already ? state.percent || 0 : 0 });
  // Already downloading in the background: the progress events carry on and
  // the install follows. Otherwise, start it now.
  if (!already) updater.downloadUpdate().catch(() => {
    installAfterDownload = false;
    publish({ state: "error", message: FAILED });
  });
}

/* ---------- Mac ---------- */

const macDir = () => path.join(app.getPath("temp"), "dwiddle-update");
let macReady = null; // { version, dmg } once a verified image is on disk
let macBusy = null;  // the download in progress, so two never run at once

// The .app bundle this process is running from.
const bundlePath = () => path.resolve(app.getPath("exe"), "../../..");

async function macCheck() {
  try {
    const reply = await fetch(LATEST, { headers: { Accept: "application/vnd.github+json" } });
    if (!reply.ok) return;
    const data = await reply.json();
    const version = String(data.tag_name || "").replace(/^v/, "");
    if (!version || !newer(version, current())) return;
    if (["installing", "downloading", "ready"].includes(state.state)) return;
    if (prefs().auto) {
      publish({ state: "downloading", version, percent: 0 });
      await macDownload(version).catch(() => publish({ state: "available", version }));
    } else {
      publish({ state: "available", version });
    }
  } catch {
    // A failed check is not worth telling anybody about.
  }
}

async function expectedHash(version, file) {
  const r = await fetch(`${RELEASES}/download/v${version}/latest-mac.yml`);
  if (!r.ok) throw new Error("no manifest");
  const text = await r.text();
  const at = text.indexOf(`url: ${file}`);
  if (at < 0) throw new Error("not in manifest");
  const m = text.slice(at).match(/sha512:\s*(\S+)/);
  if (!m) throw new Error("no checksum");
  return m[1];
}

async function macDownload(version) {
  if (macReady?.version === version) return macReady;
  if (macBusy) return macBusy;
  macBusy = (async () => {
    const file = `Dwiddle-${version}-${process.arch === "arm64" ? "arm64" : "x64"}.dmg`;
    const want = await expectedHash(version, file);
    fs.rmSync(macDir(), { recursive: true, force: true });
    fs.mkdirSync(macDir(), { recursive: true });
    const dest = path.join(macDir(), file);

    const reply = await fetch(`${RELEASES}/download/v${version}/${file}`);
    if (!reply.ok || !reply.body) throw new Error("download failed");
    const total = Number(reply.headers.get("content-length")) || 0;
    const hash = crypto.createHash("sha512");
    const out = fs.createWriteStream(dest);
    let got = 0;
    let shown = -1;
    const reader = reply.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      if (!out.write(value)) await new Promise((r) => out.once("drain", r));
      got += value.length;
      const pct = total ? Math.floor((got / total) * 100) : 0;
      if (pct !== shown) {
        shown = pct;
        publish({ state: state.state === "installing" ? "installing" : "downloading", percent: pct });
      }
    }
    await new Promise((res, rej) => out.end((err) => (err ? rej(err) : res())));

    // A corrupted or tampered download is thrown away, never installed.
    if (hash.digest("base64") !== want) {
      fs.rmSync(dest, { force: true });
      throw new Error("checksum mismatch");
    }
    macReady = { version, dmg: dest };
    if (state.state !== "installing") publish({ state: "ready", version, percent: 100 });
    return macReady;
  })();
  try { return await macBusy; } finally { macBusy = null; }
}

const run = (cmd, args) => new Promise((res, rej) =>
  execFile(cmd, args, (err, stdout) => (err ? rej(err) : res(stdout))));

function canReplaceSelf() {
  const bundle = bundlePath();
  if (!bundle.endsWith(".app") || bundle.includes("/AppTranslocation/") || bundle.startsWith("/Volumes/")) return false;
  try {
    fs.accessSync(path.dirname(bundle), fs.constants.W_OK);
    fs.accessSync(bundle, fs.constants.W_OK);
    return true;
  } catch { return false; }
}

// Mounts the image and hands a small script the job of swapping the app once
// this process has gone. The script waits for the old app to exit, copies the
// new one in beside it, and only then removes the old one, so a failed copy
// leaves the old app working.
async function macApply(ready, reopen) {
  const mount = path.join(macDir(), "mnt");
  fs.mkdirSync(mount, { recursive: true });
  await run("/usr/bin/hdiutil", ["attach", ready.dmg, "-nobrowse", "-readonly", "-noautoopen", "-mountpoint", mount]);
  const found = fs.readdirSync(mount).find((f) => f.endsWith(".app"));
  if (!found) throw new Error("no app in image");

  const script = path.join(macDir(), "swap.sh");
  fs.writeFileSync(script, `#!/bin/sh
PID="$1"; SRC="$2"; DEST="$3"; MNT="$4"; REOPEN="$5"
while kill -0 "$PID" 2>/dev/null; do sleep 0.3; done
if /usr/bin/ditto "$SRC" "$DEST.updating"; then
  rm -rf "$DEST" && mv "$DEST.updating" "$DEST"
  /usr/bin/xattr -dr com.apple.quarantine "$DEST" 2>/dev/null
else
  rm -rf "$DEST.updating"
fi
/usr/bin/hdiutil detach "$MNT" -quiet 2>/dev/null
[ "$REOPEN" = "1" ] && /usr/bin/open "$DEST"
`, { mode: 0o755 });

  spawn("/bin/sh", [script, String(process.pid), path.join(mount, found), bundlePath(), mount, reopen ? "1" : "0"], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

async function macInstall() {
  publish({ state: "installing", percent: macReady ? 100 : state.percent || 0 });
  try {
    const ready = await macDownload(state.version);
    publish({ state: "installing", percent: 100 });
    if (!canReplaceSelf()) {
      // Somewhere it cannot write, such as a standard account or the disk
      // image itself: the verified image is opened for dragging in instead.
      await shell.openPath(ready.dmg);
      publish({ state: "error", manual: true,
        message: "Dwiddle could not replace itself from where it is. The new version is open in Finder: drag it into Applications, then open it." });
      return;
    }
    await macApply(ready, true);
    setTimeout(() => app.exit(0), 700);
  } catch {
    publish({ state: "error", message: FAILED });
  }
}

// With automatic updates on, a version that finished downloading goes in as
// the app closes, without reopening it.
let appliedOnQuit = false;
function macOnQuit(event) {
  if (appliedOnQuit || !prefs().auto || !macReady || !canReplaceSelf()) return;
  appliedOnQuit = true;
  event.preventDefault();
  macApply(macReady, false).catch(() => {}).finally(() => app.exit(0));
}

/* ---------- wiring ---------- */

const check = () => (process.platform === "win32" ? winCheck() : macCheck());

function start() {
  ipcMain.handle("dwiddle:update-state", () => ({ ...state, auto: prefs().auto, platform: process.platform }));
  ipcMain.handle("dwiddle:update-set-auto", (_e, on) => {
    const p = setPrefs({ auto: !!on });
    if (updater) {
      updater.autoDownload = p.auto;
      updater.autoInstallOnAppQuit = p.auto;
    }
    publish({});
    if (p.auto && state.state === "available") {
      if (updater) updater.downloadUpdate().catch(() => {});
      else macDownload(state.version).catch(() => {});
    }
    return p;
  });
  ipcMain.handle("dwiddle:update-check", async () => {
    if (!app.isPackaged) return { ...state, dev: true };
    await check();
    return { ...state, auto: prefs().auto, platform: process.platform };
  });
  ipcMain.handle("dwiddle:install-update", () => {
    if (!app.isPackaged) return;
    return process.platform === "win32" ? winInstall() : macInstall();
  });

  if (!app.isPackaged) return; // a dev build has no release to compare against
  if (process.platform === "win32") winSetup();
  else app.on("before-quit", macOnQuit);

  setTimeout(check, 4000);
  // Once a day is plenty for something somebody leaves open for weeks.
  setInterval(check, DAY);
}

module.exports = { start };
