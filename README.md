# Timetable Management - Fall 2026

Two small apps built around one file, `time-table-fall-2026.json`, which stays the single
source of truth:

- **`server/`** - an Express API that reads and writes that JSON file directly (no database).
- **`client/`** - a React (Vite) admin UI to list/add/edit/delete teachers, courses, rooms,
  timetable slots, course-teacher allocations and timetable entries (placements).

See **[RUN.md](RUN.md)** for setup and run commands.

## Why this shape

`time-table-fall-2026.json` is a *generated* report (see its own `meta.generated_by`,
`meta.sources`, `meta.rules`) produced by an external Python pipeline that isn't in this repo.
This app doesn't try to reproduce that pipeline. Instead it treats the file as a small
database: `data.*` arrays are editable collections, `meta.grid` (days/slots) is an editable
reference table, and a handful of fields that are mechanically derivable from the rest
(teacher summaries, room usage, the `index` lookup tables, `meta.counts`) are recomputed by
the server on every write so they never drift out of sync with manual edits.

## Data model, as inferred from the file

| Concept (as the task describes it) | Where it lives in the JSON | Natural key / id |
|---|---|---|
| Teachers | `data.teachers[]` | `name` (used as `id`) |
| Courses | `data.courses[]` | `"<session>\|<code>"`, e.g. `Fall-26\|ARIN-1102` |
| Rooms | `data.rooms[]` | `name` (used as `id`) |
| Slots / Days | `meta.grid.slots[]` / `meta.grid.days[]` | slot `index`, day `code` |
| Sections (class groups) | `data.sections[]` | existing `id`, e.g. `BSARIN-1ST-1M` |
| Programs, Sessions | `data.programs[]`, `data.sessions[]` | `prefix`, `code` |
| **Course-teacher assignment (allocation)** | `data.allocations[]` - **new, added by this app** | generated `A001`, `A002`, ... |
| Timetable entries | `data.placements[]` | existing `id`, e.g. `P001` (new ones continue the sequence) |

### Why "allocations" is a new collection

The source file only recorded the *result* of scheduling (placements) plus a derived summary
(`teachers[].courses`). It had no explicit "teacher X is assigned to teach course Y for
section Z" record independent of a scheduled day/room/time - which is what the task asks for
as a distinct, manageable concept ("course-teacher assignment (allocation)", separate from
"timetable entries"). `data.allocations[]` fills that gap: it's the workload assignment made
*before* a class is placed on the grid.

**One-time migration.** Since `data.allocations` doesn't exist in the source file, the server
derives it automatically, once, the first time it starts against a given data file: it groups
`data.placements` by `(teacher, course)`, creates one allocation per group covering every
section that pair teaches, and stamps each contributing placement with the new allocation's id
(`placement.allocation_id`). This is a real write to `time-table-fall-2026.json` - you'll see
`data.allocations` (~115 entries from the Fall 2026 data) and `allocation_id` on every placement
appear in `git diff` the first time you run `npm start` after pulling this. It's guarded by
`meta.app.allocations_bootstrapped` so it never runs twice and never overwrites allocations
you've since created, edited or deleted by hand.

**Editing a teacher cascades to the timetable.** Because every allocation knows which
placements it produced, changing an allocation's `teacher` (via the UI or `PUT
/api/allocations/:id`) updates `teacher` on all of them in the same write - you don't edit the
timetable entries separately. Before applying the change, the server checks whether the new
teacher is already booked elsewhere at each of those entries' day/slots (the same double-booking
check placements use) and returns `409` with the clashing placement ids if so; pass
`"force": true` to reassign anyway. `POST /api/allocations/:id/check-teacher-change` runs the
same check without saving, for a dry-run preview (the Allocations UI uses this before offering
to save). Editing other allocation fields (sections, delivery, notes, ...) just updates the
allocation record and does not touch the linked placements.

## What the server recomputes on every write (and what it deliberately leaves alone)

**Recomputed live** (mechanical aggregation, no domain judgment involved):
- `data.teachers[].{entries, teaching_days, sections, online_blocks, courses}` - derived from
  `data.placements` (+ `data.common_courses` for `sections`/`online_blocks`/`courses`, matching
  how the source data already distinguished "entries on the department sheet" from
  "externally-arranged common course blocks").
- `data.rooms[].{units_used, units_available}` - from placements and each room's own
  `availability`; a room with `on_room_sheet: false` always has `units_available: 0`, same as
  the source data, because those are fixed/reserved spaces not counted toward capacity.
- `index.by_section` / `index.by_teacher` / `index.by_room` - lookup tables of placement/common-course ids.
- `meta.counts` - array lengths, plus a new `allocations` count.
- `meta.app` - a small block this app adds, stamping when it last wrote the file.

**Left frozen, untouched** (judgment calls from a pipeline this repo doesn't have):
`meta.verification`, `meta.rules`, `meta.open_items`, `meta.facts_update`, `meta.teacher_status`,
`meta.sources`, `meta.generated_on` / `meta.generated_by`, `meta.schedule_basis`, `meta.privacy`,
`meta.teacher_replacements`. These describe a validation pass (Saturday policy, Juma break,
contiguity, lonely trips, PASS/FAIL, etc.) this app cannot honestly reproduce without the
original `docs/rules.md` and scripts, which aren't in this repo. Re-deriving them and
overwriting the original numbers would risk presenting a guess as fact, so instead:

- `GET /api/conflicts` and the Dashboard page do a **live, mechanical** scan for teacher/room/
  section double-bookings only (the one thing this app can check with certainty) - this is
  separate from, and doesn't touch, the historical `meta.verification` block.
- `data.courses[].sections` is **not** recomputed - it's authoritative data you edit directly
  on the Course form, same as the original file treated it.
- `data.common_courses`, `data.final_year_projects`, `data.removed_offerings`, `data.unstaffed`
  are **read-only** in this app (see the Reference page) - they come from an externally
  authoritative schedule or have a one-off shape not worth generalizing into a form.

One cosmetic note: arrays that list section/placement ids (inside `index.*` and inside each
teacher's `courses[].sections`) get sorted deterministically by this app, which can reorder
them relative to the original file without changing their contents - `git diff` will show
reordering on the first save even if you didn't touch that data.

## File formatting

The source file is CRLF-terminated with 1-space JSON indentation. The server preserves both
on every write so that `git diff` stays readable instead of turning into a whole-file rewrite.

## API summary

All endpoints are under `/api`. Standard REST per resource (`GET /`, `GET /:id`, `POST /`,
`PUT /:id`, `DELETE /:id`) for: `teachers`, `courses`, `rooms`, `sections`, `programs`,
`sessions`, `allocations`, `placements`. Plus:

- `GET/POST/PUT/DELETE /api/grid` - slots live at `/api/grid/slots[/:index]`, days at
  `/api/grid/days[/:code]`.
- `POST /api/placements/check-conflicts` - dry-run conflict check used by the UI before saving.
- `POST /api/allocations/:id/check-teacher-change` - dry-run conflict check for reassigning an
  allocation's teacher, before it cascades to the linked timetable entries.
- `GET /api/conflicts` - live double-booking scan across the whole schedule.
- `GET /api/meta`, `/api/meta/index`, `/api/meta/common-courses`, `/api/meta/final-year-projects`,
  `/api/meta/removed-offerings`, `/api/meta/unstaffed` - read-only.

Creating/updating a placement returns `409` with a `conflicts` object if it double-books a
teacher, room or section; pass `"force": true` in the body to save anyway.

Deleting a teacher/room/section/course/allocation that's still referenced elsewhere returns
`409` instead of silently breaking references.
