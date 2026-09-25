// Where notebooks are kept.
//
// Ink, pasted images and imported PDF pages are far too big for the few
// megabytes of localStorage the rest of the app uses, so notebooks live in
// IndexedDB, which a browser gives hundreds of megabytes. They stay on this
// device for now; syncing them to an account needs file storage of its own.

const DB = "dwiddle-notebooks";
const STORE = "books";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const out = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(out?.result ?? out);
    tx.onerror = () => reject(tx.error);
  });
}

export const listBooks = async () => {
  const all = await run("readonly", (s) => s.getAll());
  return (all || []).sort((a, b) => (b.updated || 0) - (a.updated || 0));
};
export const getBook = (id) => run("readonly", (s) => s.get(id));
export const putBook = (book) => run("readwrite", (s) => s.put({ ...book, updated: Date.now() }));
// Stores a notebook exactly as given, keeping its own time, for copies that
// arrive from the account.
export const putRaw = (book) => run("readwrite", (s) => s.put(book));
export const deleteBook = (id) => run("readwrite", (s) => s.delete(id));

export const uid = () => Math.random().toString(36).slice(2, 10);

// A4 at 96 dots per inch, the size a page is laid out in. Imported PDF pages
// keep their own proportions.
export const PAGE_W = 794;
export const PAGE_H = 1123;

export function newPage(template = "lined", paper = "white") {
  return { id: uid(), template, paper, w: PAGE_W, h: PAGE_H, items: [] };
}

export function newBook({ title = "Untitled notebook", template = "lined", paper = "white", cover = "#3B5BFD" } = {}) {
  return { id: uid(), title, cover, template, paper, created: Date.now(), pages: [newPage(template, paper)] };
}
