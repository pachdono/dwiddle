// The level a student is studying at. Every request to the AI carries it, so
// notes, lessons, questions and explanations are pitched at it and nothing
// more advanced comes back unasked. Set at sign up, changed in Settings, and
// synced with the account like the rest of the study data.

import { load, save, KEYS } from "./store.js";

export const LEVELS = [
  { id: "primary", label: "Primary school", hint: "Ages 8 to 11" },
  { id: "ks3", label: "Years 7 to 9", hint: "Grades 6 to 8, ages 11 to 14" },
  { id: "gcse", label: "GCSE / IGCSE", hint: "Years 10 and 11, ages 14 to 16" },
  { id: "alevel", label: "A Level / IB", hint: "Years 12 and 13, ages 16 to 18" },
  { id: "uni", label: "University", hint: "First or second year" },
  { id: "basics", label: "Just the basics", hint: "Learning for interest" },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id) || null;
export const myLevel = () => levelById(load(KEYS.level, null));
export const setMyLevel = (id) => save(KEYS.level, levelById(id) ? id : null);

// How it is described to the model.
export const levelForAI = () => {
  const l = myLevel();
  return l ? `${l.label} (${l.hint})` : "";
};
