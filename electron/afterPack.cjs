// Ad hoc signing, which Apple Silicon requires.
//
// Electron ships its binary linker signed. electron-builder then renames it,
// rewrites Info.plist and adds the app's own files, which invalidates that
// signature. Intel Macs tolerate a broken signature; arm64 does not, and
// refuses to launch the app with "Dwiddle is damaged and can't be opened",
// which sounds like a corrupt download and is actually a signing problem.
//
// A real Developer ID certificate is the proper fix. Without one, an ad hoc
// signature at least makes the bundle internally consistent, so it runs.

const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const app = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  // Nested code has to be signed before the bundle that contains it, which is
  // what --deep does here. It is blunt, but correct for an ad hoc signature.
  execFileSync("codesign", [
    "--force",
    "--deep",
    "--sign", "-",
    "--timestamp=none",
    app,
  ], { stdio: "inherit" });

  execFileSync("codesign", ["--verify", "--deep", "--strict", app], { stdio: "inherit" });
  console.log("  • ad hoc signed and verified", path.basename(app));
};
