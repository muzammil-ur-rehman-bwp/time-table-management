import { Router } from 'express';
import { readData, mutate, ApiError } from '../store.js';
import { nextSeqId, findOr404, indexOr404 } from '../ids.js';
import { resolvePlacementTiming } from '../gridHelpers.js';
import { findPlacementConflicts, hasAnyConflict } from '../conflicts.js';

export const placementsRouter = Router();

const LEVELS = ['undergraduate', 'graduate'];
const KIND_TO_LEVEL = { bs: 'undergraduate', external: 'undergraduate', fyp: 'undergraduate', grad: 'graduate' };

function validateAndDenormalize(body, data) {
  if (!body.sections?.length) throw new ApiError(400, 'sections must be a non-empty array');
  for (const s of body.sections) findOr404(data.data.sections, s, 'Section');
  const teacher = findOr404(data.data.teachers, body.teacher, 'Teacher');

  const delivery = body.delivery ?? 'in-room';
  if (delivery === 'in-room') {
    const room = findOr404(data.data.rooms, body.room, 'Room');
    body.building = room.building;
  } else {
    body.room = body.room ?? null;
    body.building = body.building ?? null;
  }
  body.delivery = delivery;
  body.staffing = body.staffing ?? 'assigned';

  if (body.course_id) {
    const course = findOr404(data.data.courses, body.course_id, 'Course');
    body.course_code = body.course_code ?? course.code;
    body.course_title = body.course_title ?? course.title;
    body.credit_hours = body.credit_hours ?? course.credit_hours;
    body.session = body.session ?? course.session;
    body.semester = body.semester ?? course.semester;
    body.level = body.level ?? KIND_TO_LEVEL[course.kind] ?? 'undergraduate';
  }
  if (!body.course_code?.trim()) throw new ApiError(400, 'course_code is required');
  if (body.level && !LEVELS.includes(body.level)) {
    throw new ApiError(400, `level must be one of: ${LEVELS.join(', ')}`);
  }
  if (body.allocation_id) {
    findOr404(data.data.allocations, body.allocation_id, 'Allocation');
  }

  Object.assign(body, resolvePlacementTiming(data, { day: body.day, slots: body.slots }));
  return teacher;
}

placementsRouter.get('/', async (req, res, next) => {
  try {
    const data = await readData();
    res.json(data.data.placements);
  } catch (err) {
    next(err);
  }
});

placementsRouter.get('/:id', async (req, res, next) => {
  try {
    const data = await readData();
    res.json(findOr404(data.data.placements, req.params.id, 'Placement'));
  } catch (err) {
    next(err);
  }
});

// Dry-run conflict check, used by the UI before submitting a create/update.
placementsRouter.post('/check-conflicts', async (req, res, next) => {
  try {
    const data = await readData();
    const candidate = { ...req.body };
    try {
      validateAndDenormalize(candidate, data);
    } catch (err) {
      if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    const conflicts = findPlacementConflicts(data, candidate, req.body.id ?? null);
    res.json({ conflicts, hasConflict: hasAnyConflict(conflicts) });
  } catch (err) {
    next(err);
  }
});

placementsRouter.post('/', async (req, res, next) => {
  try {
    const result = await mutate(async (data) => {
      validateAndDenormalize(req.body, data);
      const conflicts = findPlacementConflicts(data, req.body, null);
      if (hasAnyConflict(conflicts) && !req.body.force) {
        throw new ApiError(409, 'Placement conflicts with existing schedule', conflicts);
      }
      delete req.body.force;
      const id = nextSeqId(data.data.placements, 'P');
      const item = { ...req.body, id };
      data.data.placements.push(item);
      data.__created = item;
      return data;
    });
    res.status(201).json(result.__created);
  } catch (err) {
    next(err);
  }
});

placementsRouter.put('/:id', async (req, res, next) => {
  try {
    const result = await mutate(async (data) => {
      const idx = indexOr404(data.data.placements, req.params.id, 'Placement');
      const merged = { ...data.data.placements[idx], ...req.body, id: req.params.id };
      validateAndDenormalize(merged, data);
      const conflicts = findPlacementConflicts(data, merged, req.params.id);
      if (hasAnyConflict(conflicts) && !req.body.force) {
        throw new ApiError(409, 'Placement conflicts with existing schedule', conflicts);
      }
      delete merged.force;
      data.data.placements[idx] = merged;
      data.__updated = merged;
      return data;
    });
    res.json(result.__updated);
  } catch (err) {
    next(err);
  }
});

placementsRouter.delete('/:id', async (req, res, next) => {
  try {
    await mutate(async (data) => {
      const idx = indexOr404(data.data.placements, req.params.id, 'Placement');
      data.data.placements.splice(idx, 1);
      return data;
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
