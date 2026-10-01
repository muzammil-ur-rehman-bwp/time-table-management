import { crudRouter } from './crudFactory.js';
import { ApiError } from '../store.js';

// Programs use their prefix as id (e.g. "BSARIN"); there is no separate id field
// in the source file, so we key on `prefix` directly.
export const programsRouter = crudRouter({
  label: 'Program',
  getList: (data) => data.data.programs,
  buildId: (body) => (body.prefix || '').trim(),
  validate: (body) => {
    if (!body.prefix?.trim()) throw new ApiError(400, 'Program prefix is required');
    if (!body.name?.trim()) throw new ApiError(400, 'Program name is required');
  },
  guardDelete: (program, data) => {
    if (data.data.sections.some((s) => s.program_prefix === program.id)) {
      throw new ApiError(409, `Cannot delete program "${program.id}": still referenced by sections`);
    }
  },
});
