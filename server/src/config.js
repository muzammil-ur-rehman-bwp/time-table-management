import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.resolve(__dirname, '..', '..', 'time-table-fall-2026.json');

export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
