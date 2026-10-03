// Run with: node --test --experimental-test-module-mocks scripts/subject.test.mjs
// A video's subject is worked out from what the student entered.
import { test } from "node:test";
import assert from "node:assert/strict";

const { detectSubject } = await import("../api/video.js");
const id = (...t) => detectSubject(...t)?.id ?? null;

test("each subject is recognised from its own words", () => {
  assert.equal(id("Analysing poetry", "The poet uses a metaphor and alliteration. The tone of the stanza shows the theme."), "english");
  assert.equal(id("Causes of the First World War", "The treaty, the alliance system, the Kaiser's empire and the battle of 1914 led to the war."), "history");
  assert.equal(id("Elasticity", "Price elasticity of demand measures how demand responds to price. A firm's revenue and the market supply matter."), "business");
  assert.equal(id("Solving quadratics", "Factorise the quadratic equation and solve for x. The gradient of the line and the area."), "maths");
  assert.equal(id("Osmosis", "Water moves by osmosis across the cell membrane into the nucleus of the cell; diffusion of nutrients."), "biology");
  assert.equal(id("Rivers", "Erosion by the river, deposition on the coast, the glacier and the tectonic plate near the volcano."), "geography");
  assert.equal(id("Forces", "The force on the object gives it acceleration. Energy, velocity, momentum and resistance."), "physics");
  assert.equal(id("Ionic bonding", "Atoms transfer electrons to form ionic compounds. Reactions of acids, covalent bonds and oxidation."), "chemistry");
});

test("a topic that says nothing clear gets no subject", () => {
  assert.equal(id("Study tips", "Sleep well and keep a routine."), null);
});

const { cleanScenes, SUBJECTS } = await import("../api/video.js");
const sub = (i) => SUBJECTS.find((s) => s.id === i);
const scene = (extra) => ({ heading: "A scene", lines: ["One line here.", "Another line here."], board: [{ kind: "text", text: "First point", at: 0 }, { kind: "text", text: "Second point", at: 1 }], ...extra });

test("drawings that do not belong to the subject are dropped", () => {
  const data = { title: "T", scenes: [scene({ props: [{ kind: "shop", label: "shop", at: 0 }, { kind: "quill", label: "poet", at: 0 }] }), scene({})] };
  const out = cleanScenes(data, {}, sub("english"));
  assert.deepEqual(out.scenes[0].props.map((p) => p.kind), ["quill"]);
});

test("a scene with nothing to look at is given its board as steps, except in maths", () => {
  const data = { title: "T", scenes: [scene({}), scene({})] };
  assert.equal(cleanScenes(data, {}, sub("history")).scenes[0].layout.type, "steps");
  assert.equal(cleanScenes(data, {}, sub("maths")).scenes[0].layout, undefined);
});
