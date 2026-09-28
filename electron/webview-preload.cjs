// Isolated guest: report an image drag without exposing app APIs to the page.
const { ipcRenderer } = require("electron");

window.addEventListener("dragstart", (event) => {
  if (!event.isTrusted) return;
  const image = event.target?.closest?.("img");
  const url = image?.currentSrc || image?.src || "";
  // Google also serves thumbnails as embedded image data.
  if (/^(https?:\/\/|data:image\/)/i.test(url) && url.length <= 12e6) {
    ipcRenderer.sendToHost("dwiddle:image-drag-start", url);
  }
}, true);

window.addEventListener("dragend", () => {
  ipcRenderer.sendToHost("dwiddle:image-drag-end");
}, true);
