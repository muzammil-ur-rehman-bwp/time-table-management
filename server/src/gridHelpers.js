import { ApiError } from './store.js';

// Validates a day+slots pair against meta.grid and returns the computed
// start/end/duration/day_name the same way the source file records them.
export function resolvePlacementTiming(data, { day, slots }) {
  const grid = data.meta.grid;
  const dayDef = grid.days.find((d) => d.code === day);
  if (!dayDef) throw new ApiError(400, `Unknown day "${day}"`);

  if (!Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(400, 'slots must be a non-empty array of slot indexes');
  }
  const sorted = [...slots].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const idx = sorted[i];
    if (!grid.slots[idx]) throw new ApiError(400, `Unknown slot index ${idx}`);
    if (i > 0 && sorted[i] !== sorted[i - 1] + 1) {
      throw new ApiError(400, 'slots must be contiguous (a single unbroken block)');
    }
  }

  const first = grid.slots[sorted[0]];
  const last = grid.slots[sorted[sorted.length - 1]];
  return {
    day,
    day_name: dayDef.name,
    slot_index: sorted[0],
    slots: sorted,
    start: first.start,
    end: last.end,
    duration_minutes: sorted.length * grid.slot_minutes,
  };
}
