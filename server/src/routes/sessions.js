import { crudRouter } from './crudFactory.js';
import { ApiError } from '../store.js';

// Sessions use their code as id (e.g. "Fall-26"); the source file has no
// separate id field on session objects, so we key on `code` directly.
export const sessionsRouter = crudRouter({
  label: 'Session',
  getList: (data) => data.data.sessions,
  buildId: (body) => (body.code || '').trim(),
  validate: (body) => {
    if (!body.code?.trim()) throw new ApiError(400, 'Session code is required');
  },
  guardDelete: (session, data) => {
    const used =
      data.data.sections.some((s) => s.session === session.id) ||
      data.data.courses.some((c) => c.session === session.id);
    if (used) {
      throw new ApiError(409, `Cannot delete session "${session.id}": still referenced by sections or courses`);
    }
  },
});
