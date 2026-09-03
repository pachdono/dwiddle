# Studyspace

A sleek, minimal study app interface — study plan, practice quiz, and study sheet.

Currently a **UI shell**: every page reads from `src/mock.js`, no backend calls.

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5180.

## Structure

| File | What |
|---|---|
| `src/App.jsx` | Shell, sidebar nav, and all four pages |
| `src/mock.js` | All content — swap for real API responses |
| `src/styles.css` | The whole design system |

## Wiring up a backend

Content lives only in `src/mock.js`, and the fake latency is one hook,
`useFakeRun` in `App.jsx`. Replace that with `fetch` calls and the pages need no
other changes.
