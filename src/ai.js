// Calls to our own serverless functions. The NVIDIA key is never here; it
// lives only on the server, so nothing in this file can leak it.

const TRANSIENT = new Set([429, 502, 503, 504]);

// The free models fail intermittently: busy, slow, occasionally malformed. One
// quiet retry turns most of those into a success rather than an error the
// person has to act on.
async function post(path, body, attempt = 0) {
  let reply;
  try {
    reply = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  let data = null;
  try {
    data = await reply.json();
  } catch {
    // A non JSON body means the function itself fell over.
  }

  if (!reply.ok && TRANSIENT.has(reply.status) && attempt === 0) {
    await new Promise((r) => setTimeout(r, 1200));
    return post(path, body, 1);
  }

  if (!reply.ok) {
    if (reply.status === 504 || (reply.status === 502 && !data)) {
      throw new Error("That took too long and the server gave up. The model was probably slow. Try again, and it usually goes through second time.");
    }
    if (reply.status === 503) {
      throw new Error(data?.error || "The free model service is busy. Wait a minute and try again.");
    }
    if (reply.status === 404) {
      throw new Error("The AI endpoints are not running. They only exist when the app is served by Vercel, so use vercel dev locally.");
    }
    throw new Error(data?.error || `The server returned ${reply.status}`);
  }
  return data;
}

export const generateFromNotes = (notes) => post("/api/generate", { notes });

// No notes needed: the course, subject and syllabus topic are the brief.
export const generateFromSyllabus = ({ course, subject, topic }) =>
  post("/api/generate", { syllabus: { course, subject, topic } });

export const gradeWriting = ({ answer, prompt, rubric, criteria, scale }) =>
  post("/api/grade", { answer, prompt, rubric, criteria, scale });

// Fresh questions for a test section, written to that section's style.
export const generateTestQuestions = ({ test, section, skills, count, passage, audio, avoid }) =>
  post("/api/testgen", { test, section, skills, count, passage, audio, avoid });

// Emails a copy of feedback. Storing it is the client's job; this only notifies.
export const notifyFeedback = (payload) => post("/api/feedback", payload);

// A photograph or scan is transcribed on the server by a model that reads
// images, and the text then goes through generateFromNotes like anything else.
export const readImage = (image) => post("/api/read", { image });
