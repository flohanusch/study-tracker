# Study Tracker

A personal study tracker and planner:
- a GitHub-style heatmap of daily study time (darker = more minutes, hover shows the details)
- classes with topics as checklists, to tick off what I've covered

Live at https://flohanusch.github.io/study-tracker/ (GitHub Pages, deployed from `main`, root folder).

## How we work together

I don't write the JavaScript myself; my JS is basic. You write the code, and I want to **understand** everything that goes in.

- **Plan first.** Before changing anything, explain in a few sentences what you'll change and why. Wait for my OK on anything bigger than a small fix.
- **Explain every change.** After editing, walk through what each new part does in plain language, block by block. Point out traps and why the code avoids them.
- **Small steps.** One feature at a time, small enough to review. Don't refactor unrelated code.
- **Don't commit or push.** I review the diff and run `git add` / `commit` / `push` myself. Suggest a commit message when a step is done.
- **Optional "try this".** End each step with one small change I could make myself (2 minutes) to check I understood it.

## Tech

- Plain **HTML + CSS + JavaScript**. No frameworks, no build step, no npm, no external libraries unless I ask.
- Data lives in **localStorage** in the browser. The repo contains code only.
- Must run by opening `index.html` directly in the browser (`file://`) and on GitHub Pages.

## Files

- `index.html`: page structure
- `style.css`: all styling
- `app.js`: all logic

## Data model

Stored as one JSON object under the localStorage key `study-tracker`:

```js
{
  classes:  [{ id, name, color, topics: [{ id, title, done }] }],
  sessions: [{ id, date: "YYYY-MM-DD", minutes, classId }]
}
```

- IDs come from `crypto.randomUUID()`.
- `classId` on sessions is added in step 5. Older sessions without it must keep working.
- If the shape ever changes, migrate old saved data in `loadData()` so nothing breaks for existing users.

## Conventions

- Every change follows the same pattern: **change `data` → `saveData()` → re-render**.
- Render functions rebuild their part of the page from `data`.
- Use `textContent` for user input, never `innerHTML` with user text.
- Dates are local-time `"YYYY-MM-DD"` strings from `todayString()`. Never use `toISOString()` for dates (UTC gives the wrong day around midnight).
- Keep the page usable on a phone (around 400px wide).

## Roadmap

1. ✅ **Setup**: repo, files, GitHub Pages
2. ⏳ **Logging time**: form with date + minutes, saved to localStorage, list of sessions
3. **Heatmap**: last 52 weeks as a grid (weeks as columns, Mon–Sun as rows), 5 color levels by minutes, tooltip on hover with date and time studied
4. **Classes & topics**: add/delete classes and topics, check topics off, progress per class
5. **Connect**: pick a class when logging time; stats (streak, hours this week, total); per-class breakdown in the heatmap tooltip
6. **Polish**: delete/edit sessions, backup export/import (JSON), dark mode, README with a screenshot

Update the ✅ / ⏳ markers when a step is done.

## Privacy

Never commit personal data (exports, backups, real study logs) to the repo. It's public.
