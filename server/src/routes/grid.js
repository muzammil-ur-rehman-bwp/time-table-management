import { Router } from 'express';
import { readData, mutate, ApiError } from '../store.js';

// The weekly day/slot grid used by every placement. Lives at meta.grid in
// the source file rather than under data.*, so it gets its own small router
// instead of the generic crudFactory.
export const gridRouter = Router();

gridRouter.get('/', async (req, res, next) => {
  try {
    const data = await readData();
    res.json(data.meta.grid);
  } catch (err) {
    next(err);
  }
});

gridRouter.post('/slots', async (req, res, next) => {
  try {
    const result = await mutate(async (data) => {
      const { code, start, end, label } = req.body;
      if (!code || !start || !end) throw new ApiError(400, 'code, start and end are required');
      if (data.meta.grid.slots.some((s) => s.code === code)) {
        throw new ApiError(409, `Slot "${code}" already exists`);
      }
      const index = data.meta.grid.slots.length;
      const slot = { index, code, start, end, label: label ?? code, minutes: data.meta.grid.slot_minutes };
      data.meta.grid.slots.push(slot);
      data.meta.grid.slots_per_day = data.meta.grid.slots.length;
      data.__created = slot;
      return data;
    });
    res.status(201).json(result.__created);
  } catch (err) {
    next(err);
  }
});

gridRouter.put('/slots/:index', async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    const result = await mutate(async (data) => {
      const slot = data.meta.grid.slots.find((s) => s.index === index);
      if (!slot) throw new ApiError(404, `Slot index ${index} not found`);
      Object.assign(slot, req.body, { index });
      data.__updated = slot;
      return data;
    });
    res.json(result.__updated);
  } catch (err) {
    next(err);
  }
});

gridRouter.delete('/slots/:index', async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    await mutate(async (data) => {
      const inUse = data.data.placements.some((p) => p.slots?.includes(index));
      if (inUse) throw new ApiError(409, `Cannot delete slot ${index}: still used by placements`);
      const i = data.meta.grid.slots.findIndex((s) => s.index === index);
      if (i === -1) throw new ApiError(404, `Slot index ${index} not found`);
      data.meta.grid.slots.splice(i, 1);
      data.meta.grid.slots_per_day = data.meta.grid.slots.length;
      return data;
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

gridRouter.post('/days', async (req, res, next) => {
  try {
    const result = await mutate(async (data) => {
      const { code, name } = req.body;
      if (!code || !name) throw new ApiError(400, 'code and name are required');
      if (data.meta.grid.days.some((d) => d.code === code)) {
        throw new ApiError(409, `Day "${code}" already exists`);
      }
      const day = { code, name };
      data.meta.grid.days.push(day);
      data.__created = day;
      return data;
    });
    res.status(201).json(result.__created);
  } catch (err) {
    next(err);
  }
});

gridRouter.delete('/days/:code', async (req, res, next) => {
  try {
    await mutate(async (data) => {
      const inUse = data.data.placements.some((p) => p.day === req.params.code);
      if (inUse) throw new ApiError(409, `Cannot delete day "${req.params.code}": still used by placements`);
      const i = data.meta.grid.days.findIndex((d) => d.code === req.params.code);
      if (i === -1) throw new ApiError(404, `Day "${req.params.code}" not found`);
      data.meta.grid.days.splice(i, 1);
      return data;
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
