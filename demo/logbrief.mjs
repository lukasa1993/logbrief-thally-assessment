#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const levels = ['debug', 'info', 'warn', 'error'];
const usage = `Usage: node demo/logbrief.mjs FILE [--service NAME] [--min-level LEVEL]

Summarize a UTF-8 JSONL log export without sending it anywhere.
LEVEL is debug, info, warn, or error (default: debug).
Blank lines are ignored. Every other line must be a JSON object with a
non-empty string service and one of the four supported level values.

Exit codes: 0 success, 1 input/read error, 2 invalid arguments or record.
`;

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (!args[0] || args[0].startsWith('--')) throw new Error(usage.trim());
  const options = { file: args[0], minLevel: 'debug', service: undefined };
  const seen = new Set();
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    if (!['--service', '--min-level'].includes(flag)) throw new Error(`Unknown option: ${flag}`);
    if (seen.has(flag)) throw new Error(`Duplicate option: ${flag}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    seen.add(flag);
    if (flag === '--service') options.service = value;
    else if (levels.includes(value)) options.minLevel = value;
    else throw new Error(`Unsupported level: ${value}. Use debug, info, warn, or error.`);
  }
  return options;
}

function sortedObject(counts) {
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

async function summarize({ file, service, minLevel }) {
  const stream = createReadStream(file, { encoding: 'utf8' });
  const input = createInterface({ input: stream, crlfDelay: Infinity });
  const byService = new Map();
  const byLevel = new Map();
  let physicalLine = 0;
  let recordsRead = 0;
  let recordsMatched = 0;
  try {
    for await (const raw of input) {
      physicalLine += 1;
      const line = physicalLine === 1 ? raw.replace(/^\uFEFF/, '') : raw;
      if (!line.trim()) continue;
      let record;
      try { record = JSON.parse(line); }
      catch { throw Object.assign(new Error(`Line ${physicalLine}: invalid JSON.`), { exitCode: 2 }); }
      if (!record || Array.isArray(record) || typeof record !== 'object' ||
          typeof record.service !== 'string' || !record.service.trim() || !levels.includes(record.level)) {
        throw Object.assign(new Error(`Line ${physicalLine}: expected an object with non-empty service and level debug, info, warn, or error.`), { exitCode: 2 });
      }
      recordsRead += 1;
      if ((service !== undefined && record.service !== service) || levels.indexOf(record.level) < levels.indexOf(minLevel)) continue;
      recordsMatched += 1;
      byService.set(record.service, (byService.get(record.service) ?? 0) + 1);
      byLevel.set(record.level, (byLevel.get(record.level) ?? 0) + 1);
    }
  } finally {
    input.close();
    stream.destroy();
  }
  return { recordsRead, recordsMatched, byService: sortedObject(byService), byLevel: sortedObject(byLevel) };
}

let options;
try { options = parseArgs(process.argv.slice(2)); }
catch (error) { console.error(error.message); process.exitCode = 2; }
if (options?.help) process.stdout.write(usage);
else if (options) {
  try { console.log(JSON.stringify(await summarize(options), null, 2)); }
  catch (error) {
    const message = error.exitCode ? error.message : `Cannot read input: ${error.code ?? error.message}`;
    console.error(message);
    process.exitCode = error.exitCode ?? 1;
  }
}
