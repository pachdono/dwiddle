# Dwiddle: handoff for a new Claude chat

Paste or attach this file at the start of a new chat. It describes the app, how the owner likes work done, and everything built in the previous long session.

## The project

- **Repo:** `pachdono/dwiddle` (GitHub). Live site: https://dwiddle.vercel.app
- **What it is:** a study app. Add notes, PDFs, photos or a topic, and it makes notes, lessons, practice questions, videos and flashcards. It also has a Notes+ style handwriting notebook, a Solve page (worked solutions) and exam prep.
- **Stack:**
  - React with Vite (rolldown), plain CSS in `src/styles.css`
  - Vercel serverless functions in `/api`
  - Supabase for accounts, roles and sync
  - an Electron desktop app in `/electron`
- **AI providers** (`api/_llm.js`), each only used if its key is set: OpenRouter (free models), Groq, and NVIDIA.
  - The server remembers how fast each provider answers and tries the fastest first, which is usually Groq. `LLM_ORDER` overrides the order.
  - If the first provider hasn't answered after 12 seconds, the same request also goes to the next one and the first answer wins (`LLM_HEDGE_MS`).
  - Requests with a picture only go to models that can read images.
- **Vercel Hobby plan: 12 functions maximum, and all 12 are used:** browse, chat, feedback, generate, grade, lesson, models, read, solve, testgen, video, youtube. **Never add a new file in `/api`.** Add a `mode` to an existing endpoint instead (for example `read.js` has `mode: "check"`, and `video.js` has `mode: "figure"`).

## How the owner wants work done

- **Every new feature is for testers and above only.**
  - In `App.jsx`: `early = staff || access.tester || import.meta.env.VITE_EARLY_ALL === "1"`. It's passed down to pages as the `early` prop.
  - Gate new UI with `{early && ...}`.
  - Bug fixes and speed fixes go to everyone.
- **Push to `main` so changes go live:** `git push origin HEAD:main`. Also push the working branch if one is set.
- **The owner writes casually and wants results.** Keep replies short, show screenshots, and ship.
- **Style:** British English, no em dashes in user-facing text, and comments that match the existing ones (plain explanatory prose).
- **Design preferences:**
  - hand-drawn or illustrated art, not plain gradients
  - glows only where they make sense (moon, sun)
  - it should look polished, not "vibe coded"
  - Dwiddle the duck mascot is the brand, and `DuckMark` and `Duck` are in `src/Duck.jsx`

## Testing tips

- **Build:** `npx vite build`
- **Tests:** `node --test --experimental-test-module-mocks scripts/*.test.mjs` (39 tests, all passing)
- **Build with tester features on:** `VITE_EARLY_ALL=1 npx vite build --outDir /tmp/early-dist`, then serve it with `npx vite preview --outDir /tmp/early-dist --port 5192`.
  - The preview server often dies; restart it with `setsid`.
  - Never use `pkill` or `pgrep -f` with a pattern, because it kills the calling shell.
- **Screenshots:** Playwright scripts, for example `import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs"`.
  - Enter the app by clicking "Continue without an account".
  - Stand in for AI calls with `page.route("**/api/...")`.
- **Preview page:** a private Claude Artifact of the app (no AI, no sign-in): https://claude.ai/artifact/JaSFjDAUX8Hy5dzat77DKp
  - Build with `VITE_EARLY_ALL=1 VITE_STATIC=1 npx vite build --base ./`.
  - Drop `ort/`, `seg/`, `*.wasm`, the kokoro worker, pdf.worker, `*.woff`, non-Latin font subsets and the `nanum-pen-script-[0-9]*` pieces.
  - Publish `index.html` with the remaining files.

## What was built in the last session (newest last)

### Looks
- **Painted theme backdrops** (`src/ThemeBackdrop.jsx`): each theme is a full illustrated scene with gentle motion.
  - Sakura: cherry tree, Fuji, pagoda. Midnight: moonlit lake, cabin, pines. Ocean: lighthouse, boat.
  - Sunset: striped sun. Autumn: trees, fence. Matcha: tea terraces, bamboo.
  - Cottage: house, smoke. Violet: aurora, mountains. Prismarine: underwater.
- **Readability over the scenes:**
  - frosted-glass panels (`body:has(.theme-backdrop)` rules)
  - a soft wash over the scene
  - a faint outline behind text that sits straight on the scene (excluded inside cards)
- **Scrolling:** no bounce at the top (`overscroll-behavior`).

### Practice and study
- **Practice full screen** (`src/PracticeCheer.jsx`):
  - side panels with the streak, accuracy ring, XP and a reacting duck
  - Duolingo-style confetti cheers at 3, 5, 10 in a row, and sometimes otherwise
  - the theme scene shows behind practice
- **"Explain like I'm 4" button** (`src/LikeImFour.jsx`) on Solve, practice explanations and Notes topics.
- **Study flashcards:** an extra "From your notes" deck built from terms and hard words in the notes.
- **My decks** (`src/Decks.jsx`, sidebar under Solve, route `/decks`):
  - **Making decks:**
    - type `word ; meaning`, one card per line, with a live preview
    - a photo of a word list
    - voice ("means" and "next")
    - Dwiddle can fill in missing meanings
  - **Study modes:**
    - Learn, Quizlet style: Review due, Learn it all (pick the answer, then type it), or Cram for a test
    - Flashcards
    - Quiz
  - **Spaced repetition:** Leitner boxes with steps of 1, 3, 7, 14, 30, 60 and 120 days, saved as `deck.srs`. Tiles show how many cards are due.
  - **Missed cards** come back until right. A card that was missed needs two or three right in a row. If most recent answers are wrong, Learn slows down (rounds of 4 and a first-letter hint).
  - **Colours:** deck colours follow the theme accent ("theme" colour).
  - Decks are saved on the device only (localStorage `dwiddle-decks`), with no sync yet.
- **Study time** (`src/StudyTimer.jsx`):
  - a Home card with Dwiddle and an hours:minutes:seconds picker
  - a banner across the top of every page while it runs, with pause and stop
  - × tucks it into a small chip in the corner
  - a "Time's up" pop-up offering a 5 minute break or another round
  - minutes logged per day

### Solve and videos
- **Solve:**
  - clearer steps: a heading, a plain sentence, a "Uses" rule tag, large maths lines with stacked fractions, and "Why this works"
  - the answer is repeated at the end
  - **"Your question, drawn"**: the question's own diagram, drawn to scale and checked (`api/video.js` `mode: "figure"`)
  - photos of questions are read with their diagrams described in detail (`api/read.js`)
- **Videos:**
  - a solved question's video reuses that same diagram, unmoved, in every scene
  - every scene has a visual (a drawn diagram, or a photo of the real thing via `photo: true`), and non-maths boards hold at most 3 short points
- **Video making runs in the background:** a progress chip shows anywhere in the app. The Solve video no longer blocks the page.
- **Loading screens show progress:** "Page 12 of 45", "File 2 of 5", "Part 3 of 12", "4 of 9 topics", or a time estimate (`BusyScreen` `count` and `eta`).
- **Narration:** the Kokoro voice model runs as 1 to 3 copies at once (`src/tts.js` `narratorLanes`), which should make it about 2 to 3 times faster.

### Notebook (`src/Notebook.jsx`)
- **Browser:** real Google shown inside the notebook (`igu=1`), with the reader view as a fallback.
  - The panel resizes by dragging its left edge.
  - Pictures can be dragged in, or pasted after "Copy image".
  - Fixed: pasting added the picture twice.
- **Pen features:**
  - shape recognition (draw a shape and hold; it snaps to a circle, rectangle or polygon)
  - scribble to erase
  - laser pointer
  - eraser options (highlighter only, back to the pen) and an eraser size slider
  - dashed, dotted and filled shapes
  - eyedropper
- **Pens:** six new ones (gel, calligraphy nib, felt tip, charcoal, chalk, watercolour) in a picture grid. Textured pens look the same while drawing as after.
- **Speed:** thumbnails are drawn without textures and memoised; off-screen pages are skipped (`content-visibility`).
- **Check my work, like the Derive app:**
  - a Check button sends the page image to `api/read.js` `mode: "check"`
  - mistakes are ringed in red with numbers
  - each card shows the wrong part, the fix and why, with Dismiss or Next
  - results are saved on the page (`page.checks`)

### Fixes for everyone
- Solve steps now come back as `lines`, `say` and `rule` (kept compatible with the old `work` field).
- Pictures no longer get sent to text-only models, which used to mark those models unusable.
- `VITE_STATIC=1` builds stop changing the page address, for preview hosting.

## Not yet verified on a real device (AI and network weren't reachable from the sandbox)
- Google loading inside the notebook browser (`igu=1`).
- Narration speed-up and memory use on an iPad.
- Real generation speed with Groq first, and whether Groq's daily limits hold up.
- How accurately Check my work places its red boxes. It depends on the vision model.
- Apple Pencil feel for shape snapping and scribble to erase.

## Ideas the owner may ask for next
- Move stable tester features to everyone for a "big Friday update", and add a "What's new" pop-up.
- Notes+ features still missing: audio recording synced to notes, lasso handwriting to text, a zoomed writing box.
- Sync My decks and the study timer log to the account; share decks with friends.
- A targeted notebook lag fix once the device and the laggy action are known.
- A design pass, if the owner sends reference screenshots.
