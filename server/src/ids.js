import { ApiError } from './store.js';

// Finds the next free sequential id like "P295" given existing ids "P001".."P294".
export function nextSeqId(list, prefix, pad = 3) {
  let max = 0;
  for (const item of list) {
    const m = typeof item.id === 'string' && item.id.match(new RegExp(`^${prefix}(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}

export function courseId(session, code) {
  return `${session}|${code}`;
}

export function ensureUniqueId(list, id, label) {
  if (list.some((item) => item.id === id)) {
    throw new ApiError(409, `${label} with id "${id}" already exists`);
  }
}

export function findOr404(list, id, label) {
  const item = list.find((x) => x.id === id);
  if (!item) throw new ApiError(404, `${label} "${id}" not found`);
  return item;
}

export function indexOr404(list, id, label) {
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) throw new ApiError(404, `${label} "${id}" not found`);
  return idx;
}
