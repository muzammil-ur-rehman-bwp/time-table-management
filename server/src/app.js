import express from 'express';
import cors from 'cors';
import { ApiError } from './store.js';
import { teachersRouter } from './routes/teachers.js';
import { coursesRouter } from './routes/courses.js';
import { roomsRouter } from './routes/rooms.js';
import { sectionsRouter } from './routes/sections.js';
import { programsRouter } from './routes/programs.js';
import { sessionsRouter } from './routes/sessions.js';
import { gridRouter } from './routes/grid.js';
import { allocationsRouter } from './routes/allocations.js';
import { placementsRouter } from './routes/placements.js';
import { metaRouter } from './routes/meta.js';
import { liveConflictsRouter } from './routes/conflicts.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/teachers', teachersRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/programs', programsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/grid', gridRouter);
app.use('/api/allocations', allocationsRouter);
app.use('/api/placements', placementsRouter);
app.use('/api/meta', metaRouter);
app.use('/api/conflicts', liveConflictsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { conflicts: err.details } : {}),
    });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
