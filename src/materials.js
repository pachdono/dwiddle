// Each thing you add (notes, a PDF, a topic you asked for, a chat turned into
// notes) is its own item in your library, with its own topics. They are all
// kept together in one store, so everything still syncs as one, but the
// library lists them separately and Study can focus on just one.

const uid = () => "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Material saved before items existed becomes a single item.
export function withMaterials(made) {
  if (!made || Array.isArray(made.materials)) return made;
  return { ...made, materials: made.topics?.length ? [{ id: "m0", title: made.title || "Your material", at: made.savedAt || Date.now(), topics: made.topics.map((t) => t.name) }] : [] };
}

// Records that `data` arrived: as a new item, as more of the newest item
// (a long source made in parts), or as nothing new (more questions).
export function noteMaterial(prev, data, mode) {
  const list = withMaterials(prev)?.materials || [];
  const names = (data?.topics || []).map((t) => t.name);
  if (mode === "none" || !names.length) return list;
  if (mode === "same" && list.length) {
    const last = list[list.length - 1];
    return [...list.slice(0, -1), { ...last, topics: [...new Set([...last.topics, ...names])] }];
  }
  return [...list, { id: data.materialId || uid(), title: data.title || "Your material", at: Date.now(), topics: names }];
}

// What one item holds, as if it were all the material there was.
export function viewOf(made, id) {
  const m = made?.materials?.find((x) => x.id === id);
  if (!m) return made;
  const keep = new Set(m.topics);
  const pick = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => keep.has(k)));
  return {
    ...made,
    title: m.title,
    topics: made.topics.filter((t) => keep.has(t.name)),
    questions: made.questions.filter((q) => keep.has(q.topic)),
    drills: (made.drills || []).filter((d) => keep.has(d.topic)),
    notes: pick(made.notes),
    lessons: pick(made.lessons),
    sheet: (made.sheets || []).find((s) => s.title === m.title)?.sheet || (made.title === m.title ? made.sheet : null),
  };
}

// Takes one item out. Topics another item also has are kept.
//
// What was taken out is remembered (removed, gone) so that syncing with another
// copy that still has it does not bring it back: a merge only ever adds, so
// without this a deleted item returned the next time the account synced.
const FORGET = 90 * 24 * 3600 * 1000; // deletions are remembered for 90 days
export function withoutMaterial(made, id) {
  const all = withMaterials(made);
  const m = all?.materials?.find((x) => x.id === id);
  if (!m) return all;
  const now = Date.now();
  const rest = all.materials.filter((x) => x.id !== id);
  const still = new Set(rest.flatMap((x) => x.topics));
  const gone = new Set(m.topics.filter((n) => !still.has(n)));
  const drop = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => !gone.has(k)));
  const recent = (map) => Object.fromEntries(Object.entries(map || {}).filter(([, v]) => now - (v?.at ?? v ?? 0) < FORGET));
  return {
    ...all,
    title: rest[rest.length - 1]?.title || all.title,
    materials: rest,
    topics: all.topics.filter((t) => !gone.has(t.name)),
    questions: all.questions.filter((q) => !gone.has(q.topic)),
    drills: (all.drills || []).filter((d) => !gone.has(d.topic)),
    notes: drop(all.notes),
    lessons: drop(all.lessons),
    sheets: (all.sheets || []).filter((s) => s.title !== m.title),
    removed: { ...recent(all.removed), [id]: { at: now, title: m.title } },
    gone: { ...recent(all.gone), ...Object.fromEntries([...gone].map((n) => [n, now])) },
  };
}

// Gives a library item a new name. Its sheet (kept by title) and the page
// title follow it, so nothing is lost by the rename.
export function renameMaterial(made, id, title) {
  const t = String(title || "").trim().slice(0, 120);
  const all = withMaterials(made);
  const m = all?.materials?.find((x) => x.id === id);
  if (!m || !t || t === m.title) return all;
  return {
    ...all,
    title: all.title === m.title ? t : all.title,
    materials: all.materials.map((x) => (x.id === id ? { ...x, title: t } : x)),
    sheets: (all.sheets || []).map((sh) => (sh.title === m.title ? { ...sh, title: t } : sh)),
  };
}
