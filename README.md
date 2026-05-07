# Course Journal Kit

A reusable, course-agnostic reflection journal for graduate coursework. Drop in
a syllabus, get a structured weekly journal with sources, prompts, retrieval
practice, a final synthesis builder, and a shareable public read-only view.

The app helps you **think, reflect, retrieve, and synthesize**. It does not
write your reflections, assignments, or final submissions for you.

## What it is

- A static React app you run locally or deploy to any host (Netlify, Vercel,
  GitHub Pages).
- All your drafts live in `localStorage` for fast, private writing.
- Anything you mark **Published** can be exported as JSON and committed to your
  course repo to power the public journal page.

## Course-agnostic by design

Each course is a `CoursePack` object that declares its own:

- title / code / term / description
- `sectionLabel` (`Module`, `Week`, `Unit`, `Chapter`, `Session`, `Theme`, …)
- learning outcomes
- sections (with required readings, key frameworks, prompts)
- reflection lenses, rubric criteria, retrieval-practice cards
- exit ticket questions and a final synthesis blueprint

The shipping pack is `med584` (a graduate ed-tech course used as the
reference). New courses can either be:

1. Added as a TypeScript file in `src/course-packs/` and exported from
   `src/course-packs/index.ts`, **or**
2. Built in-app from a pasted syllabus via the **Course Builder** page, which
   parses outcomes, sections, and sources into a custom pack stored in
   `localStorage`.

## Workflow

1. **Course Builder → Syllabus import.** Paste your syllabus, review the parsed
   sections + sources, and install the course pack.
2. **Section pages.** Read the prompt, capture sources, mark readings complete.
3. **Sources & Readings.** A unified inbox for required + supplementary
   readings, with reading status, key quotes, key terms, your questions, and
   your connections.
4. **Entry editor.** A guided journal with notes, summary, key concepts,
   reflection, personal connection, professional application, questions,
   ethical/equity considerations, key takeaways, AI-use disclosure, resources,
   artifacts, tags, reflection lenses, and a confidence rating.
5. **Generate Entry Scaffold.** Pulls forward your saved source notes (quotes,
   questions, connections) into a structured draft you can revise. The app
   leaves clear `[brackets]` for everything _you_ still need to write.
6. **Retrieval, Rubric, Synthesis.** Self-test cards, a course-specific rubric
   tracker, and a final synthesis builder.
7. **Export / Share.** Export everything as JSON, merge another backup back in,
   and copy a share URL to a public, read-only journal view.

## Autosave

The entry editor autosaves on a debounce. You can configure the debounce window
under **Settings → Autosave debounce**. The status pill in the right rail shows:

- _Autosave armed_ — clean, idle
- _Unsaved changes…_ — typed, debounce running
- _Saving…_ — write in flight
- _Saved &lt;time&gt;_ — last successful write
- _Save failed — try Save Now_ — fall back to the explicit save button
- ⌘/Ctrl + S triggers an immediate save.

## Default tags

New entries are pre-tagged with: `{your default tags}` + `{course code}` +
`{section label-N}` + (optional topic). Edit them under **Settings →
Default tags**.

## Public journal

`Export / Share → Copy share URL` produces a stable URL that hits the public
read-only view (`/share/:shareId`). Only entries with **Published** checked are
visible there. The public page also lists your final synthesis and further
exploration areas.

## Import / merge

`Export / Share → Import` accepts a JSON backup. Choose:

- **Merge** (default) — keeps existing entries, picks the newer of any matching
  ID by `updatedAt`, and de-dupes tags.
- **Replace** — wipes local data and uses the file as the new source of truth.
  Always confirms first.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173 (or next free port)
npm run build    # tsc -b && vite build → dist/
npm run lint
npm run preview
```

## Tech

React 19 · TypeScript · Vite · React Router · Tailwind · `localStorage` ·
zero backend.

## Project rules

See `AGENTS.md` for the principles this app must follow (course-agnostic core,
configurable terminology, accessibility, academic-integrity boundaries).
