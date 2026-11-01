// Marking a typed answer without asking anyone: spelling slips, numbers and
// ordinals written differently, a different word order, the main words of a
// longer answer. Plain functions, so they are tested without a screen.

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const digits = (t) => t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi, (w) => String(NUMBERS.indexOf(w.toLowerCase())));
const norm = (s) => digits(String(s || ""))
  .toLowerCase()
  .normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9%.+\-² ]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/^(the|a|an) /, "");

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

// Words that carry no meaning of their own in an answer.
const FILLER = new Set("the a an of in on to is are was were be by for and or with that this it its as at from".split(" "));
const ORDINALS = { first: "1st", second: "2nd", third: "3rd", fourth: "4th", fifth: "5th", sixth: "6th", seventh: "7th", eighth: "8th", ninth: "9th", tenth: "10th" };
// the meaningful words of an answer: ordinals as numbers, possessives and
// plurals dropped, filler dropped (Newton's second law -> newton 2nd law)
const tokens = (t) => norm(String(t || "").replace(/[’']s\b/gi, "")).split(" ")
  .map((w) => ORDINALS[w] || w).filter((w) => w && !FILLER.has(w))
  .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));

// "2nd law" for "Newton's second law": the same words, or the main ones of
// them, in any order, with a little extra on either side.
function looseMatch(given, answer) {
  const g = tokens(given), a = tokens(answer);
  if (!g.length || !a.length) return false;
  const gs = new Set(g), as = new Set(a);
  const shared = [...gs].filter((w) => as.has(w) || [...as].some((x) => x.length >= 6 && w.length >= 6 && distance(x, w) <= 1)).length;
  if (gs.size === as.size && shared === gs.size) return true;                       // same words, any order
  if (shared === gs.size && gs.size >= 2 && shared / as.size >= 0.6) return true;   // the main words of a longer answer
  if (shared === as.size && as.size >= 2 && gs.size - shared <= 2) return true;     // the answer plus a little more
  return false;
}

// A slip of one letter in a long word is a typo, not a wrong answer.
export function sameAnswer(given, answers) {
  const g = norm(given);
  if (!g) return false;
  return answers.map(norm).filter(Boolean).some((a) =>
    a === g || (a.length >= 6 && distance(a, g) <= 1) || (a.length >= 11 && distance(a, g) <= 2))
    || answers.filter(Boolean).some((a) => looseMatch(given, a));
}
