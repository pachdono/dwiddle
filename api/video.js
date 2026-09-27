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

export const config = { maxDuration: 60 };

const SHAPE = `Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "title": "the video's title, four to eight words",
  "subtitle": "subject · the idea it uses",
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
      "diagram": {
        "x": [-2.5, 2.5], "y": [-0.5, 2.5], "grid": true, "axes": true,
        "shapes": [
          { "type": "circle", "c": [0, 0], "r": 2, "half": "upper", "color": "blue", "fill": true, "at": 0 },
          { "type": "segment", "from": [0, 0], "to": [0.67, 0.89], "color": "blue", "dashed": false, "label": "2 − r", "at": 1 },
          { "type": "point", "p": [0, 0], "label": "O(0, 0)", "color": "ink", "at": 0 },
          { "type": "polygon", "points": [[0, 0], [1, 0], [1, 1]], "color": "purple", "fill": true, "at": 1 },
          { "type": "path", "points": [[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]], "color": "orange", "at": 0 },
          { "type": "arrow", "from": [0, 0], "to": [1, 1], "color": "red", "at": 2 },
          { "type": "text", "p": [1, 1.5], "text": "a label", "color": "green", "at": 1 }
        ]
      }
    }
  ]
}`;

const RULES = `How the video works:
- Each scene is shown while its "lines" are read aloud, one after another. "at" is the index of the line during which a board item or shape appears, so things arrive as they are talked about. Start each scene's first items at 0.
- The "lines" are the transcript. Spoken, plain, warm, like a good teacher at a whiteboard. Say symbols the way they are read aloud: "x squared", "two minus r", "eight ninths". 1 to 4 lines per scene, each under 30 words.
- 4 to 7 scenes. The first sets out what is asked and the plan. The last states the answer or the key takeaway.
- "board" holds 1 to 7 items per scene: working written with real symbols (x², √, π, ×, ÷, ≤, ≥, −, fractions as 8/9), each line a single step. "label" is a short coloured caption above the working it introduces. "answer" is for the final result only. Never a caret.
- Colours: "ink", "blue", "green", "purple", "orange", "red". Use one colour for each object and keep it: the same circle, length or quantity is the same colour in the diagram and on the board.
- "diagram" is optional. Include one whenever the idea is geometric, a graph, a force, a cycle drawn as a shape, or anything a sketch makes clearer; set it to null otherwise. Keep the same diagram across scenes that talk about it, adding to it.
- Diagram coordinates are the true mathematical positions, worked out correctly, so circles that touch really touch. "x" and "y" are the visible ranges and must contain every shape with a little margin. "half" is "upper", "lower" or null. Up to 14 shapes.
- Only what the source says, or standard facts at its level. Never invent a figure.
- British English. No em dashes or en dashes in the lines.`;

const FROM_SOLUTION = `You turn a worked solution into a short narrated explainer video that walks a student through it step by step, like a tutor at a whiteboard.

${SHAPE}

${RULES}
- Follow the worked solution's method and reach its answer. Show every step of the working on the board, one move per line.`;

const FROM_NOTES = `You turn one topic of a student's notes into a short narrated explainer video that teaches it, like a teacher at a whiteboard.

${SHAPE}

${RULES}
- Teach the topic in a sensible order: what it is, how it works, an example, then what to remember. Cover the main points of the notes on this topic and nothing from other topics.
- For a topic with no maths, the board holds short points, key terms and steps rather than equations, and a diagram only when a sketch really helps.`;

const COLORS = ["ink", "blue", "green", "purple", "orange", "red"];
const KINDS = ["label", "math", "text", "answer"];
const SHAPES = ["circle", "segment", "point", "polygon", "path", "arrow", "text"];

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pt = (p) => (Array.isArray(p) && p.length >= 2 && num(p[0]) !== null && num(p[1]) !== null ? [p[0], p[1]] : null);
const color = (c) => (COLORS.includes(c) ? c : "ink");
const at = (v, max) => Math.max(0, Math.min(max, Number.isInteger(v) ? v : 0));
const short = (s, n) => String(s ?? "").trim().slice(0, n);

// Never trust the shape. Anything the player could not draw is dropped here,
// so a bad shape costs one shape rather than the whole video.
function cleanShape(s, last) {
  if (!s || !SHAPES.includes(s.type)) return null;
  const base = { type: s.type, color: color(s.color), at: at(s.at, last) };
  const label = s.label ? { label: short(s.label, 40) } : {};
  switch (s.type) {
    case "circle": {
      const c = pt(s.c), r = num(s.r);
      if (!c || !(r > 0)) return null;
      return { ...base, c, r, half: ["upper", "lower"].includes(s.half) ? s.half : null, fill: s.fill === true, ...label };
    }
    case "segment": case "arrow": {
      const from = pt(s.from), to = pt(s.to);
      if (!from || !to) return null;
      return { ...base, from, to, dashed: s.dashed === true, ...label };
    }
    case "point": {
      const p = pt(s.p);
      return p ? { ...base, p, ...label } : null;
    }
    case "polygon": case "path": {
      const points = (Array.isArray(s.points) ? s.points : []).map(pt).filter(Boolean).slice(0, 60);
      if (points.length < 2) return null;
      return { ...base, points, fill: s.type === "polygon" && s.fill === true };
    }
    case "text": {
      const p = pt(s.p), text = short(s.text, 60);
      return p && text ? { ...base, p, text } : null;
    }
    default: return null;
  }
}

function cleanDiagram(d, last) {
  if (!d || typeof d !== "object") return null;
  const x = pt(d.x), y = pt(d.y);
  if (!x || !y || !(x[1] > x[0]) || !(y[1] > y[0])) return null;
  const shapes = (Array.isArray(d.shapes) ? d.shapes : []).map((s) => cleanShape(s, last)).filter(Boolean).slice(0, 14);
  if (!shapes.length) return null;
  return { x, y, grid: d.grid !== false, axes: d.axes !== false, shapes };
}

function cleanVideo(data) {
  const scenes = (Array.isArray(data?.scenes) ? data.scenes : []).map((sc) => {
    const lines = (Array.isArray(sc?.lines) ? sc.lines : []).map((l) => short(l, 400)).filter(Boolean).slice(0, 5);
    if (!lines.length) return null;
    const last = lines.length - 1;
    const board = (Array.isArray(sc.board) ? sc.board : [])
      .filter((b) => b && typeof b.text === "string" && b.text.trim())
      .map((b) => ({ kind: KINDS.includes(b.kind) ? b.kind : "text", text: short(b.text, 160), color: color(b.color), at: at(b.at, last) }))
      .slice(0, 8);
    return { heading: short(sc.heading, 80) || "Step", lines, board, diagram: cleanDiagram(sc.diagram, last) };
  }).filter(Boolean).slice(0, 8);
  if (scenes.length < 2) return null;
  return { title: short(data.title, 100) || "Explained", subtitle: short(data.subtitle, 120), scenes };
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
    const text = await ask({ system, user, maxTokens: 5000, temperature: 0.3, json: true });
    const video = cleanVideo(safeParse(text, "scenes"));
    if (!video) return userError(res, 502, "The video did not come back complete. Try again.");
    res.status(200).json(video);
  } catch (err) {
    fail(res, err);
  }
}
