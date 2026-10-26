// The parts of the app that most visits never touch.
//
// The course catalogue is fetched the first time someone opens Courses, and kept
// after that. It reaches the app through H() once loaded.

let mods = null;
let inflight = null;

export function H() {
  return mods;
}

export function loadHeavy() {
  if (mods) return Promise.resolve(mods);
  if (inflight) return inflight;

  inflight = import("./courses.js").then((courses) => {
    mods = { COURSES: courses.COURSES };
    inflight = null;
    return mods;
  });

  return inflight;
}
