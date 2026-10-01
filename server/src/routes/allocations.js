import { Router } from 'express';
import { readData, mutate, ApiError } from '../store.js';
import { nextSeqId, findOr404, indexOr404 } from '../ids.js';

// Allocations are the "who teaches what, for which sections" workload
// assignment - introduced by this app because the source file only recorded
// the end result (placements) and a derived summary (teachers[].courses),
// not an explicit pre-schedule assignment step. See README.md.
export const allocationsRouter = Router();

function withScheduled(allocation, data) {
  const scheduled = data.data.placements.some(
    (p) => p.allocation_id === allocation.id || (p.course_id === allocation.course_id && p.teacher === allocation.teacher)
  );
  return { ...allocation, scheduled };
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
    res.json(data.data.allocations.map((a) => withScheduled(a, data)));
  } catch (err) {
    next(err);
  }
});

allocationsRouter.get('/:id', async (req, res, next) => {
  try {
    const data = await readData();
    const item = findOr404(data.data.allocations, req.params.id, 'Allocation');
    res.json(withScheduled(item, data));
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
    res.status(201).json(withScheduled(result.__created, result));
  } catch (err) {
    next(err);
  }
});

allocationsRouter.put('/:id', async (req, res, next) => {
  try {
    const result = await mutate(async (data) => {
      const idx = indexOr404(data.data.allocations, req.params.id, 'Allocation');
      const merged = { ...data.data.allocations[idx], ...req.body, id: req.params.id };
      validateAndDenormalize(merged, data);
      data.data.allocations[idx] = merged;
      data.__updated = merged;
      return data;
    });
    res.json(withScheduled(result.__updated, result));
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
