// Mechanical, deterministic derived-data recompute, run after every mutation.
//
// What this touches (safe to recompute: pure aggregation, no domain judgment):
//   - data.teachers[].{entries,teaching_days,sections,online_blocks,courses}
//   - data.rooms[].{units_used,units_available}
//   - index.by_section / index.by_teacher / index.by_room
//   - meta.counts
//   - meta.app (last-modified stamp added by this app)
//
// What this deliberately never touches (see README "Scope & inferred decisions"):
//   - meta.verification, meta.rules, meta.open_items, meta.facts_update,
//     meta.teacher_status, meta.sources, meta.generated_on/by, meta.privacy,
//     meta.schedule_basis, meta.teacher_replacements
//   - data.courses[].sections (authoritative, edited directly via the Courses form)
//   - data.common_courses, data.final_year_projects, data.removed_offerings,
//     data.unstaffed (read-only reference lists in this app)

function dayOrder(data) {
  const days = data.meta?.grid?.days?.map((d) => d.code) ?? [];
  return (code) => {
    const i = days.indexOf(code);
    return i === -1 ? days.length : i;
  };
}

function uniqSorted(arr, cmp) {
  return [...new Set(arr)].sort(cmp);
}

function recomputeTeachers(data) {
  const order = dayOrder(data);
  const placements = data.data.placements ?? [];
  const commonCourses = data.data.common_courses ?? [];

  for (const teacher of data.data.teachers ?? []) {
    const myPlacements = placements.filter((p) => p.teacher === teacher.id);
    const myCommon = commonCourses.filter((c) => c.teacher === teacher.id);

    // entries/teaching_days reflect only the department's own placements, matching
    // the source data (an externally-arranged common course doesn't make the
    // teacher "enter" the department's schedule); online_blocks below tracks the
    // common-course commitment separately, and sections/courses include both.
    teacher.entries = myPlacements.length;

    teacher.teaching_days = uniqSorted(
      myPlacements.map((p) => p.day),
      (a, b) => order(a) - order(b)
    );

    teacher.sections = uniqSorted(
      [...myPlacements.flatMap((p) => p.sections ?? []), ...myCommon.flatMap((c) => c.sections ?? [])],
      (a, b) => a.localeCompare(b)
    );

    teacher.online_blocks =
      myCommon.length + myPlacements.filter((p) => p.delivery === 'online').length;

    const byCourse = new Map();
    for (const p of myPlacements) {
      const key = p.course_code;
      if (!byCourse.has(key)) {
        byCourse.set(key, {
          course_code: p.course_code,
          course_title: p.course_title,
          delivery: p.delivery ?? 'in-room',
          sections: new Set(),
          meetings: 0,
        });
      }
      const entry = byCourse.get(key);
      (p.sections ?? []).forEach((s) => entry.sections.add(s));
      entry.meetings += 1;
    }
    for (const c of myCommon) {
      const key = c.course_code;
      if (!byCourse.has(key)) {
        byCourse.set(key, {
          course_code: c.course_code,
          course_title: c.course_title,
          delivery: 'online',
          sections: new Set(),
          meetings: 0,
        });
      }
      const entry = byCourse.get(key);
      (c.sections ?? []).forEach((s) => entry.sections.add(s));
      entry.meetings += 1;
    }
    teacher.courses = [...byCourse.values()]
      .map((c) => ({ ...c, sections: [...c.sections].sort() }))
      .sort((a, b) => a.course_code.localeCompare(b.course_code));
  }
}

function recomputeRooms(data) {
  const placements = data.data.placements ?? [];
  for (const room of data.data.rooms ?? []) {
    room.units_used = placements
      .filter((p) => p.room === room.id)
      .reduce((sum, p) => sum + (p.slots?.length ?? 0), 0);
    // A room explicitly marked off the room sheet (on_room_sheet: false) is a
    // fixed/reserved space the department doesn't count toward room capacity,
    // even though it has an availability window - matches the source data.
    room.units_available =
      room.on_room_sheet === false
        ? 0
        : Object.values(room.availability ?? {}).reduce((sum, slotCodes) => sum + slotCodes.length, 0);
  }
}

function recomputeIndex(data) {
  const placements = data.data.placements ?? [];
  const commonCourses = data.data.common_courses ?? [];

  const bySection = {};
  const byTeacher = {};
  const byRoom = {};

  const addTo = (map, key, id) => {
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(id);
  };

  for (const p of placements) {
    (p.sections ?? []).forEach((s) => addTo(bySection, s, p.id));
    addTo(byTeacher, p.teacher, p.id);
    addTo(byRoom, p.room, p.id);
  }
  for (const c of commonCourses) {
    (c.sections ?? []).forEach((s) => addTo(bySection, s, c.id));
    addTo(byTeacher, c.teacher, c.id);
    // common courses are online / centrally arranged: no departmental room
  }

  for (const map of [bySection, byTeacher, byRoom]) {
    for (const key of Object.keys(map)) map[key].sort();
  }

  data.index = { by_section: bySection, by_teacher: byTeacher, by_room: byRoom };
}

function recomputeCounts(data) {
  const d = data.data;
  const unstaffedCourseCodes = new Set((d.unstaffed ?? []).map((u) => u.course_code));
  data.meta.counts = {
    sessions: d.sessions?.length ?? 0,
    sections: d.sections?.length ?? 0,
    courses: d.courses?.length ?? 0,
    teachers: d.teachers?.length ?? 0,
    rooms: d.rooms?.length ?? 0,
    placements: d.placements?.length ?? 0,
    allocations: d.allocations?.length ?? 0,
    common_course_blocks: d.common_courses?.length ?? 0,
    final_year_projects: d.final_year_projects?.length ?? 0,
    online_no_slot: d.online_no_slot?.length ?? 0,
    removed_offerings: d.removed_offerings?.length ?? 0,
    unstaffed_offerings: d.unstaffed?.length ?? 0,
    unstaffed_courses: unstaffedCourseCodes.size,
  };
}

// Fills in collections this app adds to the schema (currently just
// data.allocations) when they're missing - e.g. on a freshly-pulled file
// that has never been through a write from this app yet. Safe to call on
// every read, not just on write.
export function ensureDefaults(data) {
  data.data.allocations = data.data.allocations ?? [];
}

export function recomputeAll(data) {
  ensureDefaults(data);
  recomputeTeachers(data);
  recomputeRooms(data);
  recomputeIndex(data);
  recomputeCounts(data);
  data.meta.app = {
    ...data.meta.app,
    managed_by: 'timetable-admin app (server + client in this repo)',
    last_modified: new Date().toISOString(),
    note: 'This block and data.allocations were introduced by the admin app. meta.verification/meta.rules above are a frozen historical snapshot from the original generation pipeline and are not re-validated live - see README.md.',
  };
}
