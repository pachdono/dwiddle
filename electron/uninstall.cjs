// Removing the app from inside itself.
//
// The ordinary routes still work and always will: Settings, Apps on Windows,
// dragging to the Bin on a Mac. This is the same thing offered from a place
// people actually look, with enough in the way that nobody does it by
// accident.
//
// On a Mac everything goes to the Bin rather than being deleted, so a change
// of mind the same afternoon costs nothing. On Windows the installer's own
// uninstaller does the work, because it is what knows about the shortcuts and
// the registry entries it made.

const { app, shell, session, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// What has to be typed. Checked here as well as in the page, so that nothing
// short of a person typing it can set this off.
const PHRASE = "uninstall dwiddle";

let removing = false;
const inProgress = () => removing;

const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

function macBundle() {
  const bundle = path.resolve(app.getPath("exe"), "../../..");
  if (!bundle.endsWith(".app")) return null;
  return bundle;
}

// Opened straight from the disk image, or quarantined into a random read only
// folder by macOS: in both cases it was never installed, and there is nothing
// here that could be put in the Bin.
function macNotInstalled(bundle) {
  return bundle.startsWith("/Volumes/") || bundle.includes("/AppTranslocation/");
}

function macData() {
  const home = os.homedir();
  const id = "app.dwiddle.desktop";
  return [
    app.getPath("userData"),
    path.join(home, "Library/Caches", id),
    path.join(home, "Library/Caches/dwiddle-updater"),
    path.join(home, "Library/HTTPStorages", id),
    path.join(home, "Library/Logs/Dwiddle"),
    path.join(home, "Library/Preferences", `${id}.plist`),
    path.join(home, "Library/Saved Application State", `${id}.savedState`),
  ].filter(exists);
}

// The installer names it after the product, so "Uninstall Dwiddle.exe",
// sitting beside the app itself.
function winUninstaller() {
  const exe = path.join(path.dirname(app.getPath("exe")), "Uninstall Dwiddle.exe");
  return exists(exe) ? exe : null;
}

// Everything the page needs in order to say, before anything happens, exactly
// what will go and where to.
function plan() {
  if (!app.isPackaged) {
    return { supported: false, reason: "This is a development copy, which cannot remove itself." };
  }

  if (process.platform === "darwin") {
    const bundle = macBundle();
    if (!bundle) return { supported: false, reason: "The app could not find its own location." };
    if (macNotInstalled(bundle)) {
      return {
        supported: false,
        reason: "Dwiddle is running from the download rather than from Applications, so it is not installed. Eject the disk image and delete the download.",
      };
    }
    const home = os.homedir();
    const tidy = (p) => (p.startsWith(home) ? "~" + p.slice(home.length) : p);
    return {
      supported: true,
      platform: "darwin",
      destination: "the Bin",
      items: [bundle, ...macData()].map(tidy),
    };
  }

  if (process.platform === "win32") {
    const uninstaller = winUninstaller();
    if (!uninstaller) {
      return { supported: false, reason: "The uninstaller is missing. Remove Dwiddle from Settings, Apps instead." };
    }
    return {
      supported: true,
      platform: "win32",
      destination: "removed",
      items: [path.dirname(uninstaller), app.getPath("userData"), "Start menu and desktop shortcuts"],
    };
  }

  return { supported: false, reason: "Removing the app from inside itself is not available on this system." };
}

// Everything stored in the page, emptied through Electron first. Whatever
// happens to the folders afterwards, the notes and the sign in are gone.
async function forget() {
  try {
    await session.defaultSession.clearStorageData();
    await session.defaultSession.clearCache();
  } catch {
    // The folders are removed regardless; this is only a second line.
  }
  app.removeAsDefaultProtocolClient("dwiddle");
}

async function removeMac() {
  const bundle = macBundle();
  const data = macData();
  await forget();

  const failed = [];
  for (const item of [...data, bundle]) {
    try { await shell.trashItem(item); } catch { failed.push(item); }
  }
  if (failed.includes(bundle)) {
    return { ok: false, reason: "macOS would not let the app move itself to the Bin. Drag Dwiddle from Applications to the Bin instead." };
  }

  // Chromium writes a few small files on its way out, which would leave an
  // empty looking folder behind in Application Support. A moment after the
  // app has gone, anything that reappeared joins the rest in the Bin.
  const sweep = data
    .map((p) => `[ -e ${JSON.stringify(p)} ] && mv ${JSON.stringify(p)} "$HOME/.Trash/$(basename ${JSON.stringify(p)}) $(date +%s)"`)
    .join("; ");
  if (sweep) {
    spawn("/bin/sh", ["-c", `sleep 2; ${sweep}; true`], { detached: true, stdio: "ignore" }).unref();
  }
  return { ok: true };
}

async function removeWindows() {
  const uninstaller = winUninstaller();
  if (!uninstaller) return { ok: false, reason: "The uninstaller is missing." };
  await forget();
  // Silent, because the decision has already been made three times over in
  // the app. The uninstaller waits for this process to be gone, removes the
  // files, the shortcuts and the Apps entry, and deletes the saved data.
  spawn(uninstaller, ["/S", "--delete-app-data"], { detached: true, stdio: "ignore" }).unref();
  return { ok: true };
}

async function run(win, phrase) {
  if (String(phrase || "").trim().toLowerCase() !== PHRASE) {
    return { ok: false, reason: "The confirmation did not match." };
  }
  const p = plan();
  if (!p.supported) return { ok: false, reason: p.reason };

  removing = true;
  const result = process.platform === "darwin" ? await removeMac() : await removeWindows();
  if (!result.ok) { removing = false; return result; }

  await dialog.showMessageBox(win, {
    type: "info",
    message: "Dwiddle has been removed",
    detail: process.platform === "darwin"
      ? "The app and everything it saved on this Mac are in the Bin. Anything synced to your account is still in your account."
      : "It will finish removing itself in a few seconds. Anything synced to your account is still in your account.",
    buttons: ["Close"],
  });

  // exit rather than quit: nothing gets a chance to save a window position or
  // write a preference back into the folders that were just removed.
  app.exit(0);
  return { ok: true };
}

module.exports = { plan, run, inProgress, PHRASE };
