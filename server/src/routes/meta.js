import { Router } from 'express';
import { readData } from '../store.js';

// Read-only context for the UI: the original generator metadata (frozen -
// see README) plus a few lists this app doesn't offer CRUD for because
// they come from an external authoritative source (common courses) or have
// a shape too different from the rest to generalize (FYPs, removed
// offerings, unstaffed offerings).
export const metaRouter = Router();

metaRouter.get('/', async (req, res, next) => {
  try {
    const data = await readData();
    res.json(data.meta);
  } catch (err) {
    next(err);
  }
});

metaRouter.get('/index', async (req, res, next) => {
  try {
    const data = await readData();
    res.json(data.index);
  } catch (err) {
    next(err);
  }
});

for (const [route, key] of [
  ['common-courses', 'common_courses'],
  ['final-year-projects', 'final_year_projects'],
  ['removed-offerings', 'removed_offerings'],
  ['unstaffed', 'unstaffed'],
]) {
  metaRouter.get(`/${route}`, async (req, res, next) => {
    try {
      const data = await readData();
      res.json(data.data[key]);
    } catch (err) {
      next(err);
    }
  });
}
