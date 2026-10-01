import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_FILE } from './config.js';
import { recomputeAll } from './recompute.js';

// The source file is CRLF-terminated with 1-space indent. We preserve that
// formatting on every write so that `git diff` after this app edits the file
// stays readable and doesn't turn into a whole-file rewrite.
function serialize(data) {
  return JSON.stringify(data, null, 1).replace(/\n/g, '\r\n');
}

async function readFromDisk() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeToDisk(data) {
  const tmpFile = path.join(
    path.dirname(DATA_FILE),
    `.${path.basename(DATA_FILE)}.tmp-${process.pid}-${Date.now()}`
  );
  await fs.writeFile(tmpFile, serialize(data), 'utf8');
  await fs.rename(tmpFile, DATA_FILE);
}

// Simple in-process write queue. Every mutation re-reads the file from disk
// first (so a `git pull` done between requests is picked up) and the queue
// guarantees requests don't interleave and clobber each other's writes.
let queue = Promise.resolve();

function enqueue(task) {
  const result = queue.then(task, task);
  // Swallow rejections here so one failed request doesn't poison the queue
  // for subsequent requests; the caller still gets the real rejection below.
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export function readData() {
  return enqueue(() => readFromDisk());
}

// `mutator` receives the freshly-read data object, mutates it in place (or
// returns a new object) and the result is recomputed + persisted.
export function mutate(mutator) {
  return enqueue(async () => {
    const data = await readFromDisk();
    const result = (await mutator(data)) ?? data;
    recomputeAll(result);
    await writeToDisk(result);
    return result;
  });
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
