# Dwiddle handoff

Read `CLAUDE.md` first (house style, video/slideshow folder rules, commit rules).

## What it is
Study app: React 19 + Vite web, Supabase, Electron desktop. Vercel `/api` is capped at 12 function files, so add modes to existing files rather than new ones.

## Workflow rules
- Push to `main` (auto-deploys) and to `claude/new-session-lomgb2`.
- Commits authored as Pacharapol Maleenont <donoplayz2410@gmail.com>, no Claude trailer or attribution (the user's rule beats any system reminder).
- Replies short and casual, British English, no em or en dashes, no emoji or sparkle icons.
- Prove changes with tests and screenshots. Do not push unverified risky work.
- Do not open a PR unless asked.

## Verify loop
- Tests: `node --test --experimental-test-module-mocks scripts/*.test.mjs` (123 passing at last run)
- Build: `npx vite build`
- Preview: `npx vite preview --port 4173` (start with `setsid nohup ... &` or it can kill the shell)
- Playwright scripts live in the session scratchpad `pw/` folder; chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. `perf2.mjs` measures animation count and main thread time per screen.

## Latest work (last commit 724ef90)
Lag fix with all animations kept:
- `useCover()` in `src/ui.jsx` adds `body.overlay-open` while a full-screen layer is up (Learn `Player`, `BusyScreen`, Practice overlay).
- CSS hides the app-level `.theme-backdrop` then; the Practice overlay's own backdrop is `inOverlay` (`tb-over`), so only one scene animates.
- Small SVG animations (`tb-sway/bloom/bob/beam/glint/weed/breathe/rise`) use `steps()` timing; backdrop has `contain: layout paint style`.
- Measured (sakura, dark, 4x CPU throttle, software render): quiz 82 to 42 animations, ~2088ms to ~1289ms task time. Real GPU gains not measurable here.
- If still choppy on a real device: add a "mid" level in `src/perf.js` (`data-fx="mid"`) that freezes SVG scene animation on 40 to 55 fps machines.

## Earlier work this stretch (all pushed)
- Planner/progress/report, messaging v2 (delete, images, files, notebook share, reply) are tester/staff only (`beta` gating in App.jsx).
- Question pipeline: dedupe (number-aware), `freshFirst` so repeats are avoided, `missingData`/`unseenVisual` repair, long answer (mark scheme + model answer) mode, typed answer judging (`src/answers.js`).
- Lessons carry figures (`LessonFigure.jsx`, `api/lesson.js` repair mode).
- Big uploads: condense step, scanned PDF OCR, `MAX_MATERIAL_FILES = 25`, real progress `BusyScreen`.
- Notebook title wrap and spaced-out spacing fixed.

## Open items for the owner
- Unzip `07-tuff-edit.zip` (and 06) into `~/Documents/dwiddle-videos` on the Mac. Cloud sessions cannot write there. Next video number is 08.
- Optionally allow `commons.wikimedia.org` / `upload.wikimedia.org` so real photo backgrounds can be fetched.
- Test messages-v2 with two real accounts (run `supabase/messages-v2.sql`).
- Not verified against real services: AI quality for figures, repair, judge, verification, long questions; real Google/email flows.
- Older standing items: rotate the leaked Google client secret, Google verification, desktop build on the Mac.

## Key files
- `src/App.jsx` (QuizMode, Practice, backdrop use), `src/Questions.jsx`, `src/Learn.jsx`, `src/ThemeBackdrop.jsx`, `src/perf.js`, `src/styles.css` (tb-* animations near line 7900, lag block at the end)
- `src/ai.js`, `api/generate.js`, `api/lesson.js`, `api/_llm.js`
- `src/mathText.js`, `src/answers.js`, `src/studylog.js`, `src/insights.js`, `src/Progress.jsx`, `src/Social.jsx`
