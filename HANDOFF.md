# Dwiddle: handoff for a new Claude chat

Paste or attach this file at the start of a new chat. It covers the app, how the owner likes work done, what was built most recently, and what is still open. Last updated 3 October 2026.

## The project

- **Repo:** `pachdono/dwiddle` on GitHub, checked out at `~/Documents/dwiddle`. Live site: https://dwiddle.vercel.app (pushing to `main` deploys it).
- **Staff site:** `~/Documents/dwiddle-staff`, live at https://dwiddle-staff.vercel.app (feedback, transcripts, email replies via IMAP in `api/inbox.js`).
- **Desktop app:** Electron in `/electron`. Releases go to `pachdono/dwiddle-releases`.
- **What it is:** a study app. Add notes, PDFs, photos or a topic and it makes notes, lessons, practice questions, narrated videos and flashcards. There is also a Notes+ style handwriting notebook, Chat with Dwiddle (which now also solves questions) and exam prep.
- **Stack:**
  - React 19 with Vite (rolldown), plain CSS in `src/styles.css`
  - Vercel serverless functions in `/api`
  - Supabase for accounts, roles, sync and push subscriptions
  - Electron desktop app
- **AI providers** (`api/_llm.js` `ask()`): OpenRouter (free models), Groq and NVIDIA, each used only if its key is set.
  - The fastest provider goes first, and a second one is hedged in if the first is slow.
  - A model that says nothing for 20 seconds (JSON) or 30 seconds (text) is dropped for the next.
  - The client (`src/ai.js` `post()`) retries a failed request once, not more: more retries caused 4 minute hangs.
- **Vercel Hobby plan: 12 functions maximum, all used:** browse, chat, feedback, generate, grade, lesson, models, read, solve, testgen, video, youtube.
  - **Never add a new file in `/api`.** Add a `mode` or query parameter to an existing one (for example `chat.js` `mode: "four"`, `models.js` `?cron=remind`).
  - Files starting with `_` are helpers, not functions.

## How the owner wants work done

- **Everything is public now:** `const early = true` in `src/App.jsx`. There is no tester gating any more.
- **Commits:** author `Pacharapol Maleenont <donoplayz2410@gmail.com>`. Never add a Co-Authored-By Claude trailer or any Claude attribution; the owner does not want Claude showing on the repo. Use `git -c user.name="Pacharapol Maleenont" -c user.email="donoplayz2410@gmail.com" commit ...`.
- **Ship it:** commit and push to `main` so it goes live, then say what changed. The owner writes casually and wants results, short replies, and screenshots or videos as proof.
- **Writing:** British English, no em or en dashes anywhere (UI, replies, docs), comments in the existing plain prose style.
- **Never use the four-point sparkle icon or the sparkle emoji anywhere.** The `spark` icon was deleted from `src/ui.jsx`.
- **Design:** illustrated and polished, not plain gradients or "vibe coded". Dwiddle the duck (`src/Duck.jsx`, `src/DuckAvatars.jsx`) is the brand.
- **Money:** no paid API keys, stays on dwiddle.vercel.app, no spending advice.
- **Secrets stay out of the repo.** The VAPID private key and `CRON_SECRET` live only in Vercel env vars and a GitHub repo secret.
- **SQL for the Supabase editor:** ASCII only, no apostrophes in comments or strings, and never the word "into" inside a string literal.
- **Notebook ink changes:** test in WebKit with Pencil-like pointer input, not mouse in Chrome.

## Commands

- **Web build:** `npm run build` (output in `dist/`)
- **Tests:** `node --test --experimental-test-module-mocks scripts/*.test.mjs`
- **Desktop:** `npm run dist:all` builds Mac DMGs and the Windows web installer into `release/`, then `./scripts/publish-release.sh 1.1.12` uploads them.
  - Delete old files for the same version first, with `find release -maxdepth 1 -name "*1.1.12*" -delete` (zsh globbing breaks plain `rm`).
  - The owner prefers keeping version **1.1.12** and republishing over bumping.
  - Same-version republishes do not auto-update existing installs.
  - The Mac app is unsigned (no Apple Developer ID), so macOS shows "Dwiddle Not Opened". Users press Done, then System Settings > Privacy & Security > Open Anyway. Only a paid Developer ID removes it.

## How testing was done

- **Playwright with WebKit**, installed in a scratchpad folder with `npm i playwright`. Use `serviceWorkers: "block"` or routes are bypassed.
- **Local server:** a tiny Node static server serves `dist/` and mounts `/api/*` handlers from the repo (port 5195). Stand in for AI calls with `page.route("**/api/chat", ...)` and similar.
- **Entering the app in tests:** open `/`, click "Continue without an account". Seed data with `localStorage`: `dwiddle-made`, `dwiddle-focus`, `dwiddle-tour-done` set to `true` to skip the tour.
- **Rendering components to images:** bundle with `npx rolldown x.jsx --platform node --format esm --external react --external react-dom/server --external react/jsx-runtime`, run it from inside the repo so it finds `node_modules`, then screenshot the HTML.
- **MP4 videos:** there is no ffmpeg. Capture JPEG frames with Playwright and encode with a small Swift AVFoundation script (AVAssetWriter, H.264).
- **Live API checks:** `curl -X POST https://dwiddle.vercel.app/api/<name> -H "Origin: https://dwiddle.vercel.app" -H "Content-Type: application/json" --data ...`

## Map of the recent work

### Study and library
- **Library items** (`src/materials.js`): every generation is its own item (`made.materials`). `viewOf(made, id)` gives one item as if it were everything.
- **Study is one item at a time:** with more than one item, Study shows a "What are you studying?" picker (`StudyPicker` in `App.jsx`). Pressing Study in the sidebar or tab bar asks again. Nothing is merged.
- **New material opens straight in Study** on that item (`setMade` gives it an id and calls `setFocus`). Chat's "turn into material" and Courses do the same.
- **Topics page** groups by topic name (a bug matched an old id and showed nothing).
- **Missing questions:** failed question batches are retried once; topics left with no questions are filled from their notes when opened (`questionsFor` in `src/ai.js`).
- **Quizzes:** lengths 5 to 50; more questions in the same style are written on demand (`moreQuestions`). Enter moves on.
- **Maths** is shown printed (powers, subscripts), via `src/mathText.js` and `src/MathText.jsx` (`<M t>`). No regex lookbehind (old iOS Safari).

### Chat (Solve was merged in)
- `src/ChatRoom.jsx`, route `/chat`. Solve is gone from the nav; `/solve` and `go("solve")` open Chat.
- The chat prompt (`api/chat.js` `LEARN`) works questions through step by step. Photos and files can be attached. It can make a video, quiz you, or turn the chat into study material.
- Solve's old extras (its question-diagram video) are not in Chat.

### Explain like I'm 4
- `src/LikeImFour.jsx` with `api/chat.js` `mode: "four"`. It returns 3 or 4 swipe cards (emoji + one short sentence), then "The proper word" and its meaning.
- It is pitched at 11 to 16 year olds with real examples (games, YouTubers, football, shops). Nothing babyish: no mummy, teddies or robots. Long or repetitive cards are asked for again (up to 3 tries).

### Videos
- **Main files:** `api/video.js` (prompt, cleaning), `src/Video.jsx` (player), `src/VideoProps.jsx` (animated drawings), `src/narration.js` and `src/tts.js` (Kokoro voice on the device).
- **Drawings:** 50+ drawings, from science (sun, cell, heart, flask...) to everyday (person, people, children, worker, handshake, shop, factory, house, school, food, chartUp/Down, target, star, scales, truck, phone, bank, moneybag, megaphone, shield, calendar).
  - **States of matter:** `solid`, `liquid` and `gas` show real particle packing and motion. The player uses them for any scene about states of matter, even in old videos.
- **Accuracy rules:**
  - Science drawings are removed server side unless the scene really is about that science (`SCIENCE` in `api/video.js`).
  - Videos made from notes may not add Greek letters or functions like `max()` that the notes do not use (`keepToNotes`).
  - Explanations are kept simple and to the sheet.
- **Arrow labels** pick a spot clear of every drawing, name and other label (`route()` in `VideoProps.jsx`). Names under drawings have a backing.
- **Narration:** a video is only "ready" once its narration is recorded. The Videos page Watch button waits ("Recording narration"), and a dropped voice download is retried once. Videos can also be made silent with captions (`NarrationToggle`).

### Notebook (`src/Notebook.jsx`)
- Real pen pictures; pastel and journal papers; Ducks and Doodles stickers (no Sparkles sticker).
- Graphs (`src/NotebookGraph.jsx`, `src/graphMath.js`) with presets, including economics (PPF, supply and demand shifts, AD/AS, price ceiling/floor, costs, Lorenz). They go on the page as separate editable strokes and text.
- Auto check every few minutes; Check my work; trackpad pinch zooms the notebook so the pen stays accurate.
- Notes to notebook has compact, normal and lots-of-room spacing (`src/notesToNotebook.js`).
- Google only in the side browser (the "All websites" proxy button was removed; `api/browse.js` still exists).

### Looks and speed
- **Front page:** the Duck Lagoon scene (`src/LandingScene.jsx`), not tied to the theme.
- **Theme scenes** (`src/ThemeBackdrop.jsx`): pages sit on nearly solid panels over the scene.
  - Live blur, the full-screen noise filter and `body:has(...)` selectors were removed because they caused lag.
  - `ThemeBackdrop` puts `has-backdrop` on `<body>`, and the notebook puts `nb-open`.
- **Tour** (`src/Tour.jsx`): a 6-step tour you click through yourself. Each step lights up one place (`data-tour` attributes) and you tap it to go there: New material, Study, Library, Chat, Settings, then themes.
  - It shows once (`dwiddle-tour-done`) and can be replayed from Settings.
  - On phones Library and Settings go through More.

### Notifications and reminders
- `src/notify.js` and `src/NotifyCard.jsx`.
- **When something finishes:** an in-app pop-up when you are on the page, or a system notification when you are not.
- **Daily reminders** are web push at each user's own hour and timezone. An hourly GitHub Action (`.github/workflows/remind.yml`) calls `/api/models?cron=remind`; the logic is in `api/_remind.js`.
- **Nudge emails:** people away over a week can get an email (Gmail, at most 30 a day), with an unsubscribe link.
- **SQL:** `supabase/push.sql` was run. **Unconfirmed:** whether the owner ran `supabase/push-v2.sql` (hour column) and `supabase/push-v3.sql` (nudges). Ask before relying on them.

## Current state

- **Web:** everything above is live on `main`.
- **Desktop 1.1.12** was last published before these changes, so it does **not** have:
  - the tour
  - the lag fixes
  - the particle drawings
  - the arrow label fix

  Rebuild and republish when the owner says "build".

## Marketing work (in `~/Documents/dwiddle-videos`)

- `dwiddle-1.1.12-post`: what's new slides.
- `dwiddle-before-after`: before and after slides.
- `dwiddle-tour.mp4`: a video of the tour.
- `dwiddle-ggfez`: "The GG Fricken EZ Method", the latest post, liked by the owner.
  - It is a test-paper cover, then one slide per letter, each showing a real Dwiddle screen with brainrot questions and cartoons: Ronaldo pasta, La peace (calm and unbothered, not lapis), Fanum throwing a plate with an explosion, and Verity.
  - The cartoon SVGs are in the same folder.
- **Lessons from that post:**
  - The owner wants meme accuracy (research the meme first).
  - Use Dwiddle's own UI, not a Duolingo copy.
  - Use cartoons of the meme moments, not duck cosplay.
  - Nothing cringe.
  - "GG fricken EZ" comes from a viral song chorus, and the next line is "hey, don't say that". Do not call the song AI K-pop in posts.

## Known gaps and ideas

- **Explain like I'm 4:** free models still vary in quality.
- **Videos:** in 3-drawing scenes the arrows are short and their labels can cover most of the line.
- **Mac app:** unsigned, so the Gatekeeper warning stays.
- **Old commits:** some from an earlier session show "Claude" as the author. Rewriting history needs the owner's OK.
- **Sync:** decks and the study log sync now through `src/supabase.js`. Check them if the owner reports anything missing between devices.
