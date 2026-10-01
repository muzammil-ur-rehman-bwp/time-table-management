import { crudRouter } from './crudFactory.js';
import { ApiError } from '../store.js';
import { courseId } from '../ids.js';

const KINDS = ['bs', 'external', 'fyp', 'grad'];

// Credit-hour strings in the source file look like "3 (2-1)" = theory-lab.
// If the caller doesn't supply theory_hours/lab_hours explicitly, infer them
// from the string so the two stay consistent (purely mechanical parsing).
function inferHours(body) {
  const m = typeof body.credit_hours === 'string' && body.credit_hours.match(/\((\d+)-(\d+)\)/);
  if (!m) return body;
  return {
    ...body,
    theory_hours: body.theory_hours ?? Number(m[1]),
    lab_hours: body.lab_hours ?? Number(m[2]),
  };
}

function validate(body, data) {
  if (!body.code?.trim()) throw new ApiError(400, 'Course code is required');
  if (!body.session?.trim()) throw new ApiError(400, 'Course session is required');
  if (!data.data.sessions.some((s) => s.code === body.session)) {
    throw new ApiError(400, `Unknown session "${body.session}"`);
  }
  if (body.kind && !KINDS.includes(body.kind)) {
    throw new ApiError(400, `kind must be one of: ${KINDS.join(', ')}`);
  }
  for (const s of body.sections ?? []) {
    if (!data.data.sections.some((x) => x.id === s)) {
      throw new ApiError(400, `Unknown section "${s}" in sections`);
    }
  }
}

export const coursesRouter = crudRouter({
  label: 'Course',
  getList: (data) => data.data.courses,
  buildId: (body) => courseId(body.session, body.code),
  validate: (body, data, ctx) => {
    validate(body, data);
    Object.assign(body, inferHours(body));
    if (ctx.isUpdate) body.sections = body.sections ?? ctx.existing.sections ?? [];
    else body.sections = body.sections ?? [];
  },
  guardDelete: (course, data) => {
    const used =
      data.data.placements.some((p) => p.course_id === course.id) ||
      data.data.allocations.some((a) => a.course_id === course.id);
    if (used) {
      throw new ApiError(409, `Cannot delete course "${course.id}": still referenced by placements or allocations`);
    }
  },
});
