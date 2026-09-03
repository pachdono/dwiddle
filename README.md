# Dwiddle

A sleek, minimal study app interface with recommended topics, practice quizzes, and study sheets.

Generates study material from your own notes, drills it back at you, and runs
full length practice papers for the SAT, ACT, SSAT, IELTS and TOEFL.

See [DEPLOY.md](DEPLOY.md) for setting up NVIDIA, Supabase and Vercel.

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5180.

## Structure

| File | What |
|---|---|
| `src/App.jsx` | Shell, sidebar nav, and every page |
| `src/mock.js` | The built in Cell Biology material and question bank |
| `src/tests.js` | Standardised test structure and passage sets |
| `src/generate.js` | Question generators for the maths, grammar and verbal sections |
| `src/scoring.js` | Raw score to scaled score to percentile |
| `src/tasks.js` | Writing and speaking prompts, and the marking rubrics |
| `src/supabase.js` | Client, and the progress sync |
| `src/ai.js` | Calls to our own `/api` functions |
| `src/styles.css` | The whole design system |
| `api/generate.js` | Notes to topics, questions and a study sheet |
| `api/grade.js` | Marks a writing task against its rubric |
| `supabase/schema.sql` | Tables and row level security |

## Where the key lives

`NVIDIA_API_KEY` is read only by the functions in `api/`, which run on Vercel's
servers. The browser calls those functions and never sees the key. Anything
shipped to the client can be read by anyone who opens the developer tools, so
the key must never appear in `src/`.


