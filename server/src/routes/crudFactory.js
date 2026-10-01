import { Router } from 'express';
import { readData, mutate, ApiError } from '../store.js';
import { ensureUniqueId, indexOr404 } from '../ids.js';

// Generic list/get/create/update/delete routes for simple natural-key
// collections (teachers, rooms, sections, programs, sessions). Courses,
// allocations, placements and the grid have their own route files because
// they need id generation, cross-reference validation or conflict checks.
//
// options:
//   getList(data) -> array (the live collection inside the parsed JSON)
//   label: string for error messages
//   buildId(body): compute the id for a new item from the request body
//   validate(body, data, { isUpdate, existing }): throw ApiError on bad input
export function crudRouter({ getList, label, buildId, validate, guardDelete }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const data = await readData();
      res.json(getList(data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const data = await readData();
      const item = getList(data).find((x) => x.id === req.params.id);
      if (!item) throw new ApiError(404, `${label} "${req.params.id}" not found`);
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const result = await mutate(async (data) => {
        const list = getList(data);
        validate?.(req.body, data, { isUpdate: false });
        const id = buildId(req.body, data);
        ensureUniqueId(list, id, label);
        const item = { ...req.body, id };
        list.push(item);
        data.__created = item;
        return data;
      });
      res.status(201).json(result.__created ?? getList(result).at(-1));
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const result = await mutate(async (data) => {
        const list = getList(data);
        const idx = indexOr404(list, req.params.id, label);
        validate?.(req.body, data, { isUpdate: true, existing: list[idx] });
        list[idx] = { ...list[idx], ...req.body, id: list[idx].id };
        data.__updated = list[idx];
        return data;
      });
      res.json(result.__updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await mutate(async (data) => {
        const list = getList(data);
        const idx = indexOr404(list, req.params.id, label);
        guardDelete?.(list[idx], data);
        list.splice(idx, 1);
        return data;
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
