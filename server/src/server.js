import { app } from './app.js';
import { PORT, DATA_FILE } from './config.js';

app.listen(PORT, () => {
  console.log(`Timetable API listening on http://localhost:${PORT}`);
  console.log(`Reading/writing: ${DATA_FILE}`);
});
