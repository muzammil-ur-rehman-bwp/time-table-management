import { crudRouter } from './crudFactory.js';
import { ApiError } from '../store.js';

export const teachersRouter = crudRouter({
  label: 'Teacher',
  getList: (data) => data.data.teachers,
  buildId: (body) => (body.id || body.name || '').trim(),
  validate: (body) => {
    if (!body.name?.trim()) throw new ApiError(400, 'Teacher name is required');
  },
  guardDelete: (teacher, data) => {
    const used =
      data.data.placements.some((p) => p.teacher === teacher.id) ||
      data.data.allocations.some((a) => a.teacher === teacher.id);
    if (used) {
      throw new ApiError(
        409,
        `Cannot delete teacher "${teacher.id}": still referenced by placements or allocations`
      );
    }
  },
});
