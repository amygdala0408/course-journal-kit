# Course Journal Kit

A static React 19 SPA (TypeScript, Vite, Tailwind CSS) for academic reflection journals. All data lives in browser `localStorage`/IndexedDB — no backend required.

## Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 5173) |
| Lint | `npm run lint` |
| Build | `npm run build` (runs `tsc -b && vite build`) |
| Preview prod build | `npm run preview` |

## Cursor Cloud specific instructions

- The app is zero-backend by default. Running `npm run dev` is all that's needed to have a fully functional dev environment.
- Supabase integration is entirely optional (gated by `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars). Without these, the app works fully offline with localStorage.
- There are no automated test suites (no `npm test`). Verify correctness via `npm run lint` and `npm run build` (which includes full TypeScript type-checking via `tsc -b`).
- The Vite dev server supports HMR; changes to React components reflect instantly without page reload.
- The production build produces a single-chunk JS bundle >500 kB — this is expected and generates a non-blocking warning during `npm run build`.
- To test the app end-to-end in a browser, create a course via Course Builder first (paste any syllabus text), then navigate to the entry editor to create journal entries.
