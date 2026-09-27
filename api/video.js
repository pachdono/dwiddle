// A narrated explainer, as a script the app animates.
//
// Nothing here is a video file. The model writes scenes: a heading, what is
// said, a diagram described in coordinates, and the lines of working that
// appear on the board as they are talked about. The app draws and reads it,
// which costs one call instead of rendering minutes of footage, and means the
// transcript is the script itself, word for word.
//
// Two sources: a question already worked through on Solve, or one topic of a
// student's notes.

import { ask, safeParse, fail, userError, MAX_INPUT } from "./_llm.js";
import { allow } from "./_guard.js";
import { buildFigures, sceneDiagram } from "./_figure.js";

export const config = { maxDuration: 60 };

const SHAPE = `Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "title": "the video's title, four to eight words",
  "subtitle": "subject · the idea it uses",
  "figures": [
    {
      "id": "main",
      "axes": true, "grid": true,
      "values": { "r": "8/9" },
      "points": { "O": ["0", "0"], "S": ["-1", "0"], "C": ["3*r - 2", "r"] },
      "shapes": [
        { "id": "big", "type": "circle", "center": "O", "r": "2", "half": "upper", "color": "blue", "fill": true },
        { "id": "c", "type": "circle", "center": "C", "r": "r", "color": "purple", "fill": true },
        { "id": "OC", "type": "segment", "from": "O", "to": "C", "color": "blue", "label": "2 − r" },
        { "id": "dotO", "type": "point", "at": "O", "label": "O(0, 0)", "color": "ink" }
      ],
      "checks": [
        { "type": "tangent", "a": "big", "b": "c" },
        { "type": "length", "from": "O", "to": "C", "equals": "2 - r" }
      ]
    }
  ],
  "scenes": [
    {
      "heading": "what this scene does, three to six words",
      "lines": ["what is said, one sentence each, in order"],
      "board": [
        { "kind": "label", "text": "a short coloured caption", "color": "blue", "at": 0 },
        { "kind": "math", "text": "OC = 2 − r", "color": "ink", "at": 0 },
        { "kind": "text", "text": "a short point in words", "color": "ink", "at": 1 },
        { "kind": "answer", "text": "r = 8/9 units", "color": "green", "at": 2 }
      ],
      "figure": "main",
      "show": [{ "id": "big", "at": 0 }, { "id": "c", "at": 1 }, { "id": "OC", "at": 1 }]
    }
  ]
}`;

const RULES = `How the video works:
- Each scene is shown while its "lines" are read aloud, one after another. "at" is the index of the line during which a board item or figure shape appears, so things arrive as they are talked about. Start each scene's first items at 0.
- The "lines" are the transcript. Spoken, plain, warm, like a good teacher at a whiteboard. Say symbols the way they are read aloud: "x squared", "two minus r", "eight ninths". 1 to 4 lines per scene, each under 30 words.
- 4 to 7 scenes. The first sets out what is asked and the plan. The last states the answer or the key takeaway.
- "board" holds 1 to 7 items per scene: working written with real symbols (x², √, π, ×, ÷, ≤, ≥, −, fractions as 8/9), each line a single step. "label" is a short coloured caption above the working it introduces. "answer" is for the final result only. Never a caret.
- Colours: "ink", "blue", "green", "purple", "orange", "red". Use one colour for each object and keep it: the same circle, length or quantity is the same colour in the figure and on the board.
- A figure is optional. Use one whenever the idea is geometric, a graph, a force, a structure or anything a picture makes clearer; scenes without one set "figure" to null.
- Only what the source says, or standard facts at its level. Never invent a figure.
- British English. No em dashes or en dashes in the lines.`;

const FIGURES = `Figures, which the app draws to scale and checks before showing:
- A figure is drawn once and used by any scene through "figure" (its id, or null for no diagram) and "show" (which of its shapes appear, and on which line). Keep a figure the same across scenes, revealing more of it.
- Every number is an exact expression the app calculates: "8/9", "2 - r", "sqrt(3)/2", "2*cos(pi/6)", "r^2". Use + - * / ^ ( ), sqrt, sin, cos, tan (radians), pi, and names from "values". Never a rounded decimal you worked out yourself.
- "points" are named positions, [x, y] with y upwards. Shapes refer to points by name or by an [x, y] pair of expressions.
- Shape types: "circle" (center, r, half "upper"/"lower"/null, fill); "ellipse" (center, rx, ry, turn in degrees, fill); "rect" (from and to opposite corners, round for rounded corners, fill); "segment" and "arrow" (from, to, dashed, label); "point" (at, label); "polygon" (through: points, fill); "path" (through: points); "graph" (y: a function of x such as "x^2 - 2", from, to); "text" (at, text); "callout" (to: the point it names, at: where its words go, text) for labelling a part with a line pointing to it. Up to 24 shapes.
- "checks" state every fact the figure must satisfy, and the app tests each one: "tangent" (a, b: circles or segments that touch), "on" (point lies on shape), "length" (from, to, equals), "perpendicular" and "parallel" (a, b: segments), "inside" (inner shape or point lies wholly inside outer). Give a check for every relationship in the question or topic: every touching, every length given, and "inside" for every part drawn within another, like each organelle inside the cell. A figure that fails a check is sent back to you to fix.
- Sizes are true to life relative to each other: a chloroplast is small beside the cell it sits in, the nucleus smaller than the cell, and so on. Leave space between parts that do not touch.
- Maths and coordinate figures set "axes" and "grid" true. Everything else sets them false and labels parts with "callout" rather than point labels.
- For a standard labelled diagram that a textbook would show as a picture, like a plant or animal cell, the heart, a leaf in cross section, a flower, the eye, a neuron, a volcano or a distillation apparatus, give the figure as { "id": "cell", "picture": "the exact title of the Wikipedia article", e.g. "Plant cell" } instead of drawing it. A real labelled diagram is clearer than a sketch.`;

const FROM_SOLUTION = `You turn a worked solution into a short narrated explainer video that walks a student through it step by step, like a tutor at a whiteboard.

${SHAPE}

${RULES}

${FIGURES}
- Follow the worked solution's method and reach its answer. Show every step of the working on the board, one move per line.`;

const FROM_NOTES = `You turn one topic of a student's notes into a short narrated explainer video that teaches it, like a teacher at a whiteboard.

${SHAPE}

${RULES}

${FIGURES}
- Teach the topic in a sensible order: what it is, how it works, an example, then what to remember. Cover the main points of the notes on this topic and nothing from other topics.
- For a topic with no maths, the board holds short points, key terms and steps rather than equations, and a diagram only when a sketch really helps.`;

const COLORS = ["ink", "blue", "green", "purple", "orange", "red"];
const KINDS = ["label", "math", "text", "answer"];
const color = (c) => (COLORS.includes(c) ? c : "ink");
const at = (v, max) => Math.max(0, Math.min(max, Number.isInteger(v) ? v : 0));
const short = (s, n) => String(s ?? "").trim().slice(0, n);

const REPAIR = `You fix diagrams for a study video. Each figure below failed checks: the numbers do not satisfy the facts the figure is meant to show, or parts could not be calculated.

Work out the correct exact values, then return ONE JSON object and nothing else:
{ "figures": [ every figure listed, corrected, in the same format and with the same ids and shape ids ] }

Keep every shape id the scenes use. Fix positions and sizes with exact expressions (never rounded decimals) so every check passes; keep checks that state real facts, and only remove a check if the fact it states is wrong. Sizes stay true to life relative to each other.`;

// Never trust the shape. Anything the player could not draw is dropped here,
// so a bad part costs that part rather than the whole video.
function cleanScenes(data, figures) {
  const scenes = (Array.isArray(data?.scenes) ? data.scenes : []).map((sc) => {
    const lines = (Array.isArray(sc?.lines) ? sc.lines : []).map((l) => short(l, 400)).filter(Boolean).slice(0, 5);
    if (!lines.length) return null;
    const last = lines.length - 1;
    const board = (Array.isArray(sc.board) ? sc.board : [])
      .filter((b) => b && typeof b.text === "string" && b.text.trim())
      .map((b) => ({ kind: KINDS.includes(b.kind) ? b.kind : "text", text: short(b.text, 160), color: color(b.color), at: at(b.at, last) }))
      .slice(0, 8);
    const fig = typeof sc.figure === "string" ? figures[sc.figure] : null;
    return { heading: short(sc.heading, 80) || "Step", lines, board, diagram: sceneDiagram(fig, sc.show, last) };
  }).filter(Boolean).slice(0, 8);
  if (scenes.length < 2) return null;
  return { title: short(data.title, 100) || "Explained", subtitle: short(data.subtitle, 120), scenes };
}

// Builds the figures, sends any that fail their checks back once to be
// fixed, and leaves out any that still fail.
async function checkedFigures(list) {
  let { figures, problems } = buildFigures(list);
  const failing = Object.keys(problems);
  if (!failing.length) return figures;
  try {
    const broken = list.filter((f) => failing.includes(String(f?.id || "main")));
    const text = await ask({
      system: REPAIR,
      user: broken.map((f) => `Figure ${JSON.stringify(f)}\nProblems:\n- ${problems[String(f?.id || "main")].join("\n- ")}`).join("\n\n"),
      maxTokens: 3000, temperature: 0.1, json: true,
    });
    const fixed = safeParse(text, "figures")?.figures;
    if (Array.isArray(fixed)) {
      const again = buildFigures(fixed);
      for (const id of failing) {
        if (again.figures[id] && !again.problems[id]) { figures[id] = again.figures[id]; delete problems[id]; }
      }
    }
  } catch { /* the repair is a second chance, not a requirement */ }
  for (const id of Object.keys(problems)) figures[id] = null;
  return figures;
}

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 6 })) return;
  const body = req.body || {};
  let system, user;

  if (body.solution && typeof body.solution === "object") {
    const s = body.solution;
    const steps = (Array.isArray(s.steps) ? s.steps : []).map((st, i) =>
      `Step ${i + 1}: ${short(st?.do, 200)}\n${short(st?.work, 800)}\nWhy: ${short(st?.why, 400)}`).join("\n\n");
    const text = [
      `The question: ${short(s.asked || body.problem, 3000)}`,
      body.problem ? `As the student gave it:\n${short(body.problem, 6000)}` : "",
      `The answer: ${short(s.answer, 400)}`,
      `The worked steps:\n${steps}`,
      s.idea ? `The idea it tests: ${short(s.idea, 600)}` : "",
    ].filter(Boolean).join("\n\n");
    if (text.length < 60) return userError(res, 400, "There is no worked solution to explain yet.");
    system = FROM_SOLUTION;
    user = text.slice(0, MAX_INPUT);
  } else {
    const topic = short(body.topic, 160);
    const notes = String(body.notes || "").trim();
    if (!topic || notes.length < 80) return userError(res, 400, "This topic has no notes to make a video from yet.");
    system = FROM_NOTES;
    user = `The topic: ${topic}\n\nThe student's notes on it:\n\n${notes.slice(0, MAX_INPUT)}`;
  }

  try {
    const text = await ask({ system, user, maxTokens: 6000, temperature: 0.3, json: true });
    const data = safeParse(text, "scenes");
    const figures = await checkedFigures(Array.isArray(data?.figures) ? data.figures : []);
    const video = cleanScenes(data, figures);
    if (!video) return userError(res, 502, "The video did not come back complete. Try again.");
    res.status(200).json(video);
  } catch (err) {
    fail(res, err);
  }
}
