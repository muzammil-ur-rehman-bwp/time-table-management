import { app } from './app.js';
import { PORT, DATA_FILE } from './config.js';
import { bootstrapAllocationsFromPlacements } from './bootstrap.js';

async function main() {
  const { derivedCount } = await bootstrapAllocationsFromPlacements();
  if (derivedCount > 0) {
    console.log(
      `One-time migration: derived ${derivedCount} allocation(s) from existing placements and wrote them to ${DATA_FILE}.`
    );
  }

  app.listen(PORT, () => {
    console.log(`Timetable API listening on http://localhost:${PORT}`);
    console.log(`Reading/writing: ${DATA_FILE}`);
  });
}

main();
