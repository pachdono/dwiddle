// Check a key and see what it can run, before deploying anything.
//
//   NVIDIA_API_KEY=nvapi-... node scripts/list-models.mjs
//
// Pass the key on the command line like that rather than saving it in a file,
// so it never ends up committed.

const key = process.env.NVIDIA_API_KEY;

if (!key) {
  console.error("Set NVIDIA_API_KEY first:\n\n  NVIDIA_API_KEY=nvapi-... node scripts/list-models.mjs\n");
  process.exit(1);
}

const reply = await fetch("https://integrate.api.nvidia.com/v1/models", {
  headers: { Authorization: `Bearer ${key}` },
});

if (!reply.ok) {
  console.error(reply.status === 401
    ? "That key was rejected. Check you copied all of it."
    : `NVIDIA returned ${reply.status}`);
  process.exit(1);
}

const { data = [] } = await reply.json();
const ids = data.map((m) => m.id).filter(Boolean).sort();

console.log(`${ids.length} models available to this key:\n`);
ids.forEach((id) => console.log("  " + id));

const instruct = ids.filter((id) => /instruct/i.test(id));
if (instruct.length) {
  console.log(`\nGood choices for this app (${instruct.length} instruct models):\n`);
  instruct.slice(0, 10).forEach((id) => console.log("  " + id));
  console.log("\nThe server picks one automatically. Set NVIDIA_MODEL only to override it.");
}
