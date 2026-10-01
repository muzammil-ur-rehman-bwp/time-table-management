// Live, on-demand conflict checking for placements. This is intentionally
// limited to mechanical double-booking checks (same room/teacher/section,
// same day, overlapping slot indexes). It does NOT attempt to reproduce the
// full domain rule set recorded in meta.rules / meta.verification of the
// source file (Saturday policy, Juma break, contiguity, lonely trips, etc.)
// - those were produced by an external generation pipeline this repo does
// not contain, and re-deriving them here would risk presenting guessed
// judgments as authoritative. See README.md "Scope & inferred decisions".

function overlaps(aSlots, bSlots) {
  const b = new Set(bSlots);
  return aSlots.some((s) => b.has(s));
}

// Returns { teacher: [placementIds], room: [placementIds], section: [placementIds] }
// of existing placements that clash with `candidate` on the same day.
// `excludeId` lets an update check against everything except itself.
export function findPlacementConflicts(data, candidate, excludeId = null) {
  const conflicts = { teacher: [], room: [], section: [] };
  for (const p of data.data.placements) {
    if (p.id === excludeId) continue;
    if (p.day !== candidate.day) continue;
    if (!overlaps(p.slots, candidate.slots)) continue;
    if (candidate.teacher && p.teacher === candidate.teacher) conflicts.teacher.push(p.id);
    if (candidate.room && p.room === candidate.room) conflicts.room.push(p.id);
    if (candidate.sections?.some((s) => p.sections?.includes(s))) conflicts.section.push(p.id);
  }
  return conflicts;
}

export function hasAnyConflict(conflicts) {
  return conflicts.teacher.length > 0 || conflicts.room.length > 0 || conflicts.section.length > 0;
}
