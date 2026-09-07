# Design handoff

Inputs for the UI/UX pass, meant to be dropped into a Claude Design project
or handed to a designer as-is.

- `../design-brief.md`: the brief (task, constraints, pages, what to solve,
  and the DESIGN.md format to deliver).
- `current-ui/*.png`: screenshots of every page of the current app, rendered
  at 1440 px wide. They show real names and figures from the household data,
  so the folder is gitignored. Share them deliberately, or regenerate them
  after swapping in a demo database.
- To see it live: `deno task serve` in this repo, then http://127.0.0.1:8000.
  Styling is one CSS block in `src/web/views/layout.tsx`, chart colors in
  `PALETTE` in the same file.

Expected back:

- `DESIGN.md` at the repo root (format described in the brief).
- Research memo and mockups in this folder (`docs/design/`).
- Optionally, CSS changes limited to `src/web/views/layout.tsx` and the view
  files under `src/web/views/`.
