// Takes the screenshots the Get the app page shows.
//
// Real captures of Dwiddle rather than drawings of it, so the page shows
// exactly what someone gets. Each one is taken in a hidden window at the size
// of the device it stands for, loaded with a realistic set of study material,
// at twice the pixel density so it stays sharp on a Retina screen.
//
// With the dev server running on port 5180:
//
//   ./node_modules/.bin/electron scripts/capture-shots.cjs
//   node scripts/compress-shots.mjs

const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.commandLine.appendSwitch("force-device-scale-factor", "2");

const BASE = process.env.SHOTS_URL || "http://localhost:5180";
const OUT = path.join(__dirname, "..", "src", "assets", "shots");
const FIXTURE = require("./shots-fixture.json");

const SHOTS = [
  { name: "desktop-notes", w: 1280, h: 800, route: "/study-sheet", desktop: true },
  { name: "desktop-lesson", w: 1280, h: 800, route: "/learn", desktop: true, open: "Scarcity" },
  { name: "phone-lesson", w: 390, h: 844, route: "/learn", open: "Scarcity" },
  { name: "phone-notes", w: 390, h: 844, route: "/study-sheet", scrollTo: "Factors of production" },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(shot) {
  const win = new BrowserWindow({
    width: shot.w,
    height: shot.h,
    useContentSize: true,
    show: false,
    backgroundColor: "#ffffff",
    webPreferences: { backgroundThrottling: false },
  });
  const js = (code) => win.webContents.executeJavaScript(code);
  // The app rewrites its own address as it starts, which Electron reports as a
  // cancelled load even though the page is there. That is not a failure.
  const open = async (url) => {
    try { await win.loadURL(url); } catch (err) {
      if (!/ERR_ABORTED|ERR_FAILED/.test(String(err))) throw err;
      await wait(800);
    }
  };

  // The material goes in first, on the same origin, from a plain file that
  // runs no code, then the app is loaded fresh so it starts up with it.
  await open(`${BASE}/manifest.webmanifest`);
  await js(`
    localStorage.clear();
    localStorage.setItem("dwiddle-made", ${JSON.stringify(JSON.stringify(FIXTURE))});
    localStorage.setItem("dwiddle-banner", "true");
    localStorage.setItem("dwiddle-theme", ${JSON.stringify(JSON.stringify("light"))});
    sessionStorage.setItem("dwiddle-entered", "true");
  `);
  await open(`${BASE}${shot.route}`);
  await wait(1500);

  // Drawn as the installed app draws itself, which has no link to go and get
  // the app it already is.
  if (shot.desktop) {
    await js(`document.querySelector(".app")?.classList.add("is-desktop");
      [...document.querySelectorAll(".nav-item")].find((b) => b.textContent.trim() === "Get the app")?.remove();`);
  }
  if (shot.open) {
    await js(`[...document.querySelectorAll(".ln-item")].find((b) => b.textContent.includes(${JSON.stringify(shot.open)}))?.click()`);
    await wait(1200);
  }
  if (shot.scrollTo) {
    await js(`[...document.querySelectorAll(".nt-sec")].find((s) => s.querySelector("h2")?.textContent.includes(${JSON.stringify(shot.scrollTo)}))?.scrollIntoView({ block: "start" })`);
  }
  await wait(900); // animations finish before the picture is taken

  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT, `${shot.name}.png`), image.toPNG());
  const { width, height } = image.getSize();
  console.log(`  ${shot.name}: ${width} x ${height}`);
  win.destroy();
}

// Each shot has its own window, closed when it is done, and Electron quits
// the moment the last window closes unless told otherwise.
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  try {
    for (const shot of SHOTS) await shoot(shot);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
  app.quit();
});
