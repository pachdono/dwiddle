// Take ownership in the outer document as a drag leaves the research frame.
// Frame-local handlers (such as Google Lens) must not receive a notebook drop.
export function attachNotebookDropTarget({ host = window, getPages, onDrop }) {
  let activeWork = null;
  let expiry;
  const clear = () => {
    host.clearTimeout(expiry);
    activeWork?.classList.remove('nb-image-drop-active');
    activeWork = null;
  };
  const accepts = (event) => {
    const pages = getPages();
    if (!pages || !event.dataTransfer) return false;
    const r = pages.getBoundingClientRect();
    return event.clientX >= r.left && event.clientX < r.right && event.clientY >= r.top && event.clientY < r.bottom
      && [...event.dataTransfer.types].some((t) => ['Files', 'text/html', 'text/uri-list', 'text/plain', 'text/x-moz-url'].includes(t));
  };
  const over = (event) => {
    if (!accepts(event)) { clear(); return; }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    activeWork = getPages().closest('.nb-work');
    activeWork?.classList.add('nb-image-drop-active');
    host.clearTimeout(expiry);
    expiry = host.setTimeout(clear, 1500);
  };
  const drop = (event) => {
    const accepted = accepts(event);
    clear();
    if (!accepted) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    onDrop(event);
  };
  const key = (event) => { if (event.key === 'Escape') clear(); };
  const handlers = { dragenter: over, dragover: over, drop, dragend: clear, blur: clear, keydown: key };
  for (const [type, handler] of Object.entries(handlers)) host.addEventListener(type, handler, true);
  return () => {
    clear();
    for (const [type, handler] of Object.entries(handlers)) host.removeEventListener(type, handler, true);
  };
}
