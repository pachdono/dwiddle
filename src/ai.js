// Calls to our own serverless functions. The NVIDIA key is never here; it
// lives only on the server, so nothing in this file can leak it.

async function post(path, body) {
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

  if (!reply.ok) {
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

export const gradeWriting = ({ answer, prompt, rubric, criteria, scale }) =>
  post("/api/grade", { answer, prompt, rubric, criteria, scale });
