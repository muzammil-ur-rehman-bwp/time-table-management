import { crudRouter } from './crudFactory.js';
import { ApiError } from '../store.js';

export const roomsRouter = crudRouter({
  label: 'Room',
  getList: (data) => data.data.rooms,
  buildId: (body) => (body.id || body.name || '').trim(),
  validate: (body) => {
    if (!body.name?.trim()) throw new ApiError(400, 'Room name is required');
    if (body.availability && typeof body.availability !== 'object') {
      throw new ApiError(400, 'availability must be an object keyed by day code');
    }
  },
  guardDelete: (room, data) => {
    if (data.data.placements.some((p) => p.room === room.id)) {
      throw new ApiError(409, `Cannot delete room "${room.id}": still referenced by placements`);
    }
  },
});
