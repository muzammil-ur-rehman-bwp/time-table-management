import { Router } from 'express';
import { readData } from '../store.js';
import { findPlacementConflicts, hasAnyConflict } from '../conflicts.js';

// A full scan of the current schedule for double-bookings, useful for a
// dashboard widget. See conflicts.js for exactly what this does and doesn't check.
export const liveConflictsRouter = Router();

liveConflictsRouter.get('/', async (req, res, next) => {
  try {
    const data = await readData();
    const report = [];
    for (const p of data.data.placements) {
      const conflicts = findPlacementConflicts(data, p, p.id);
      if (hasAnyConflict(conflicts)) report.push({ placement_id: p.id, conflicts });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});
