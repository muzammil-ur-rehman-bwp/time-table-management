import { Router } from 'express';
import { readData, mutate, ApiError } from '../store.js';
import { nextSeqId, findOr404, indexOr404 } from '../ids.js';
import { findPlacementConflicts, hasAnyConflict } from '../conflicts.js';

// Allocations are the "who teaches what, for which sections" workload
// assignment - introduced by this app because the source file only recorded
// the end result (placements) and a derived summary (teachers[].courses),
// not an explicit pre-schedule assignment step. See README.md.
//
// Every allocation here either came from the one-time migration that derives
// them from existing placements (bootstrap.js) or was created through this
// API, so `linked_placement_ids` (placements whose allocation_id points back
// here) is reliable - that's what the teacher-reassignment cascade below
// uses to find what to update.
export const allocationsRouter = Router();

function linkedPlacements(allocation, data) {
  return data.data.placements.filter((p) => p.allocation_id === allocation.id);
}

function withLinks(allocation, data) {
  const linked = linkedPlacements(allocation, data);
  return { ...allocation, linked_placement_ids: linked.map((p) => p.id), scheduled: linked.length > 0 };
}

// Conflicts that reassigning `newTeacher` onto this allocation's linked
// placements would create, one entry per affected placement (only entries
// that actually clash are included).
function teacherChangeConflicts(allocation, newTeacher, data) {
  const linked = linkedPlacements(allocation, data);
  const report = [];
  for (const p of linked) {
    const conflicts = findPlacementConflicts(data, { ...p, teacher: newTeacher }, p.id);
    if (hasAnyConflict(conflicts)) report.push({ placement_id: p.id, conflicts });
  }
  return report;
}

function validateAndDenormalize(body, data) {
  const course = findOr404(data.data.courses, body.course_id, 'Course');
  const teacher = findOr404(data.data.teachers, body.teacher, 'Teacher');
  for (const s of body.sections ?? []) {
    findOr404(data.data.sections, s, 'Section');
  }
  if (!body.sections?.length) throw new ApiError(400, 'sections must be a non-empty array');

  body.course_code = course.code;
  body.course_title = course.title;
  body.credit_hours = course.credit_hours;
  body.session = course.session;
  body.delivery = body.delivery ?? 'in-room';
  body.meetings_per_week = body.meetings_per_week ?? course.meetings_per_week ?? 1;
  return { course, teacher };
}

allocationsRouter.get('/', async (req, res, next) => {
  try {
    const data = await readData();
    res.json(data.data.allocations.map((a) => withLinks(a, data)));
  } catch (err) {
    next(err);
  }
});

allocationsRouter.get('/:id', async (req, res, next) => {
  try {
    const data = await readData();
    const item = findOr404(data.data.allocations, req.params.id, 'Allocation');
    res.json(withLinks(item, data));
  } catch (err) {
    next(err);
  }
});

// Dry-run: what would reassigning this allocation's teacher break? Used by
// the UI before committing a teacher change.
allocationsRouter.post('/:id/check-teacher-change', async (req, res, next) => {
  try {
    const data = await readData();
    const allocation = findOr404(data.data.allocations, req.params.id, 'Allocation');
    findOr404(data.data.teachers, req.body.teacher, 'Teacher');
    const report = teacherChangeConflicts(allocation, req.body.teacher, data);
    res.json({ conflicts: report, hasConflict: report.length > 0, affectedPlacements: linkedPlacements(allocation, data).length });
  } catch (err) {
    next(err);
  }
});

allocationsRouter.post('/', async (req, res, next) => {
  try {
    const result = await mutate(async (data) => {
      validateAndDenormalize(req.body, data);
      const id = nextSeqId(data.data.allocations, 'A');
      const item = { ...req.body, id };
      data.data.allocations.push(item);
      data.__created = item;
      return data;
    });
    res.status(201).json(withLinks(result.__created, result));
  } catch (err) {
    next(err);
  }
});

allocationsRouter.put('/:id', async (req, res, next) => {
  try {
    const result = await mutate(async (data) => {
      const idx = indexOr404(data.data.allocations, req.params.id, 'Allocation');
      const existing = data.data.allocations[idx];
      const merged = { ...existing, ...req.body, id: req.params.id };
      validateAndDenormalize(merged, data);

      const teacherChanged = req.body.teacher && req.body.teacher !== existing.teacher;
      if (teacherChanged) {
        const conflictReport = teacherChangeConflicts(existing, merged.teacher, data);
        if (conflictReport.length > 0 && !req.body.force) {
          throw new ApiError(
            409,
            `Reassigning "${req.params.id}" to ${merged.teacher} would double-book them on ${conflictReport.length} existing timetable entr${conflictReport.length === 1 ? 'y' : 'ies'}`,
            conflictReport
          );
        }
        // Cascade: every placement this allocation produced follows the new teacher.
        for (const p of linkedPlacements(existing, data)) {
          p.teacher = merged.teacher;
        }
      }
      delete merged.force;

      data.data.allocations[idx] = merged;
      data.__updated = merged;
      return data;
    });
    res.json(withLinks(result.__updated, result));
  } catch (err) {
    next(err);
  }
});

allocationsRouter.delete('/:id', async (req, res, next) => {
  try {
    await mutate(async (data) => {
      const idx = indexOr404(data.data.allocations, req.params.id, 'Allocation');
      const stillScheduled = data.data.placements.some((p) => p.allocation_id === req.params.id);
      if (stillScheduled) {
        throw new ApiError(409, `Cannot delete allocation "${req.params.id}": a placement still references it`);
      }
      data.data.allocations.splice(idx, 1);
      return data;
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
