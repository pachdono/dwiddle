// The parts of the app that most visits never touch.
//
// tests.js alone is larger than the entire application file: 213 authored
// questions and the long reading passages behind them. Together with the
// question generators, the course catalogue, the writing rubrics and the score
// conversions, that is well over half the source, and none of it is needed to
// open the app, add material or practise your own notes.
//
// So it is fetched the first time someone opens Test prep or Courses, and kept
// after that. Everything reaches it through H() once loaded.

let mods = null;
let inflight = null;

export function H() {
  return mods;
}

export function loadHeavy() {
  if (mods) return Promise.resolve(mods);
  if (inflight) return inflight;

  inflight = Promise.all([
    import("./tests.js"),
    import("./generate.js"),
    import("./courses.js"),
    import("./tasks.js"),
    import("./scoring.js"),
  ]).then(([tests, generate, courses, tasks, scoring]) => {
    mods = {
      TESTS: tests.TESTS,
      TEST_QUESTIONS: tests.TEST_QUESTIONS,
      SECTIONS: tests.SECTIONS,
      BUILDERS: generate.BUILDERS,
      COURSES: courses.COURSES,
      TASKS: tasks.TASKS,
      RUBRICS: tasks.RUBRICS,
      estimate: scoring.estimate,
    };
    inflight = null;
    return mods;
  });

  return inflight;
}
