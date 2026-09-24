import { createPortal } from "react-dom";

// The small pieces every page is built from: the icon set, the heading at the
// top of a page, and the inline spinner. They sit apart from the app itself so
// that a page living in its own file can use them without importing the app
// back into itself.

const paths = {
  home: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1V9.5Z",
  topics: "M4 5.5h12M4 10h12M4 14.5h8",
  quiz: "M7 7a3 3 0 1 1 3 3v2M10 15.5v.5",
  sheet: "M5 3h7l3 3v11H5zM12 3v3h3M7.5 10h5M7.5 13h5",
  target: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM10 13.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z",
  cap: "M2.5 7 10 3.5 17.5 7 10 10.5 2.5 7ZM5.5 8.6V13c0 1.4 2 2.5 4.5 2.5s4.5-1.1 4.5-2.5V8.6",
  chat: "M3.5 5.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H8l-3.5 3v-3H4.5a1 1 0 0 1-1-1z",
  star: "M10 2.8l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.1l5-.7z",
  library: "M4 4h4v12H4zM10 4h3v12h-3zM15 5l2 11",
  upload: "M10 13V4M6.5 7.5 10 4l3.5 3.5M4 13v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2",
  spark: "M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z",
  arrow: "M4 10h11M11 6l4 4-4 4",
  file: "M5 3h7l3 3v11H5zM12 3v3h3",
  sun: "M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM10 2.5v1.6M10 15.9v1.6M17.5 10h-1.6M4.1 10H2.5M15.3 4.7l-1.1 1.1M5.8 14.2l-1.1 1.1M15.3 15.3l-1.1-1.1M5.8 5.8 4.7 4.7",
  moon: "M16 11.7A6.5 6.5 0 0 1 8.3 4a6.5 6.5 0 1 0 7.7 7.7Z",
  text: "M4 5.5h12M4 10h12M4 14.5h7",
  cards: "M6.5 6.5h9v9h-9zM4.5 13V4.5h8.5",
  exam: "M5 3h7l3 3v11H5zM12 3v3h3M7.5 11l1.5 1.5L12.5 9",
  bolt: "M11 2.5 4.5 11.5H9l-1 6 6.5-9H10z",
  trash: "M4.5 6h11M8 6V4.5h4V6M6 6l.7 10.5h6.6L14 6M8.5 9v5M11.5 9v5",
  menu: "M3.5 6h13M3.5 10h13M3.5 14h13",
  close: "M5 5l10 10M15 5L5 15",
  pen: "M4 16h3l8.5-8.5a2.1 2.1 0 0 0-3-3L4 13z",
  mic: "M10 12.5a2.5 2.5 0 0 0 2.5-2.5V5a2.5 2.5 0 0 0-5 0v5a2.5 2.5 0 0 0 2.5 2.5ZM5 9.5a5 5 0 0 0 10 0M10 15v2.5",
  build: "M3 16.5h14M5.5 16.5v-5h3v5M11.5 16.5V6h3v10.5",
  timer: "M10 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM10 8v3l2 1.2M8 2.5h4",
  flag: "M5 17V3.5h9l-1.6 3 1.6 3H5",
  check: "M4.5 10.5 8 14l7.5-8",
  // A phone, for the install page. An arrow would read as a file download,
  // and there is no file to download.
  download: "M6.5 2.5h7a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 16V4a1.5 1.5 0 0 1 1.5-1.5ZM8.5 15h3",
};

// The gear needs a 24 grid, so it carries its own viewBox.
const GEAR = {
  viewBox: "0 0 24 24",
  d: [
    "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
    "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  ],
};

export function Icon({ name, size = 16 }) {
  const gear = name === "gear";
  const d = gear ? GEAR.d : [paths[name]];
  return (
    <svg width={size} height={size} viewBox={gear ? GEAR.viewBox : "0 0 20 20"} fill="none"
      stroke="currentColor" strokeWidth={gear ? 1.8 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}

export function Loading({ label }) {
  return (
    <span className="row">
      <span className="spinner" />
      {label}
    </span>
  );
}

// Somewhere to put anything that must cover the whole window.
//
// Pages fade in by animating a transform, and an element with a transform
// becomes the frame its fixed position children are measured against. So a
// full screen layer rendered inside a page only ever covers the page, with the
// sidebar still showing beside it. Rendering it at the top of the document
// takes it out of every page's frame at once.
export function Portal({ children }) {
  return createPortal(children, document.body);
}
