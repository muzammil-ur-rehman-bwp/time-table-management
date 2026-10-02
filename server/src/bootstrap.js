import { mutate } from './store.js';

// One-time migration, run once per data file: data.allocations didn't exist
// in the source schema, so on a file this app has never touched, there's
// nothing to show on the Allocations page even though the real assignments
// are implicit in every placement's teacher/course/sections. This derives
// one allocation per (teacher, course) pair actually found in the timetable,
// covering every section that pair teaches, and stamps the originating
// placements with the new allocation_id so that editing the allocation's
// teacher later can find and update them (see allocations.js).
//
// Runs once: guarded by meta.app.allocations_bootstrapped, so it never
// overwrites allocations you've since created, edited or deleted by hand.
export async function bootstrapAllocationsFromPlacements() {
  let derivedCount = 0;
  const result = await mutate((data) => {
    if (data.meta.app?.allocations_bootstrapped) return data;

    if ((data.data.allocations?.length ?? 0) > 0) {
      data.meta.app = { ...data.meta.app, allocations_bootstrapped: true };
      return data;
    }

    const groups = new Map();
    for (const p of data.data.placements ?? []) {
      if (!p.teacher || !p.course_code) continue;
      const key = `${p.teacher}\u0000${p.course_id ?? p.course_code}`;
      if (!groups.has(key)) {
        groups.set(key, {
          teacher: p.teacher,
          course_id: p.course_id ?? null,
          course_code: p.course_code,
          course_title: p.course_title,
          credit_hours: p.credit_hours,
          session: p.session,
          delivery: p.delivery ?? 'in-room',
          sections: new Set(),
          placementIds: [],
        });
      }
      const g = groups.get(key);
      (p.sections ?? []).forEach((s) => g.sections.add(s));
      g.placementIds.push(p.id);
    }

    const allocations = [];
    let seq = 0;
    for (const g of groups.values()) {
      seq += 1;
      const id = `A${String(seq).padStart(3, '0')}`;
      allocations.push({
        id,
        course_id: g.course_id,
        course_code: g.course_code,
        course_title: g.course_title,
        credit_hours: g.credit_hours,
        session: g.session,
        delivery: g.delivery,
        meetings_per_week: g.placementIds.length,
        teacher: g.teacher,
        sections: [...g.sections].sort(),
        notes: 'Auto-derived from existing timetable entries on first run.',
      });
      for (const pid of g.placementIds) {
        const placement = data.data.placements.find((p) => p.id === pid);
        if (placement) placement.allocation_id = id;
      }
    }

    data.data.allocations = allocations;
    data.meta.app = { ...data.meta.app, allocations_bootstrapped: true };
    derivedCount = allocations.length;
    return data;
  });
  return { data: result, derivedCount };
}
