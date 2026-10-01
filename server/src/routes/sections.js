import { crudRouter } from './crudFactory.js';
import { ApiError } from '../store.js';

export const sectionsRouter = crudRouter({
  label: 'Section',
  getList: (data) => data.data.sections,
  buildId: (body) => (body.id || '').trim(),
  validate: (body, data) => {
    if (!body.id?.trim()) throw new ApiError(400, 'Section id is required');
    if (body.program_prefix && !data.data.programs.some((p) => p.prefix === body.program_prefix)) {
      throw new ApiError(400, `Unknown program_prefix "${body.program_prefix}"`);
    }
    if (body.session && !data.data.sessions.some((s) => s.code === body.session)) {
      throw new ApiError(400, `Unknown session "${body.session}"`);
    }
  },
  guardDelete: (section, data) => {
    const d = data.data;
    const refs =
      d.placements.some((p) => p.sections?.includes(section.id)) ||
      d.courses.some((c) => c.sections?.includes(section.id)) ||
      d.allocations.some((a) => a.sections?.includes(section.id)) ||
      d.common_courses.some((c) => c.sections?.includes(section.id));
    if (refs) {
      throw new ApiError(
        409,
        `Cannot delete section "${section.id}": still referenced by courses, allocations, common courses or placements`
      );
    }
  },
});
