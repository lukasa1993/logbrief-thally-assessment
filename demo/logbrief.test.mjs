import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const cli = join(root, 'logbrief.mjs');
const sample = join(root, 'examples/release.jsonl');
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
function withInput(content, action) {
  const directory = mkdtempSync(join(tmpdir(), 'logbrief-test-'));
  const file = join(directory, 'input.jsonl');
  writeFileSync(file, content);
  try { action(file); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('quickstart counts the checked-in export', () => {
  const result = run(sample);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), {
    recordsRead: 6, recordsMatched: 6,
    byService: { catalog: 2, checkout: 4 }, byLevel: { error: 3, info: 2, warn: 1 },
  });
});
test('minimum level includes more severe levels', () => {
  const result = run(sample, '--min-level', 'warn');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    recordsRead: 6, recordsMatched: 4,
    byService: { catalog: 1, checkout: 3 }, byLevel: { error: 3, warn: 1 },
  });
});
test('combined filters match the guide output', () => {
  const result = run(sample, '--service', 'checkout', '--min-level', 'error');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    recordsRead: 6, recordsMatched: 2, byService: { checkout: 2 }, byLevel: { error: 2 },
  });
});
test('no matches succeeds with empty counts', () => {
  const result = run(sample, '--service', 'missing');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    recordsRead: 6, recordsMatched: 0, byService: {}, byLevel: {},
  });
});
test('blank lines, CRLF, initial BOM, UTF-8 and no final newline work', () => {
  withInput('\uFEFF{"service":"café","level":"debug"}\r\n\r\n{"service":"café","level":"info"}', file => {
    const result = run(file);
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).recordsRead, 2);
    assert.deepEqual(JSON.parse(result.stdout).byService, { 'café': 2 });
  });
});
test('empty file succeeds', () => withInput('', file => {
  const result = run(file);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).recordsRead, 0);
}));
test('malformed JSON reports physical line and does not emit a partial summary', () => {
  withInput('{"service":"ok","level":"info"}\n\ninvalid\n', file => {
    const result = run(file);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Line 3: invalid JSON/);
  });
});
test('invalid records fail even if a filter would exclude them', () => {
  for (const value of [null, [], {}, { service: '', level: 'error' }, { service: 'a', level: 'ERROR' }, { service: 1, level: 'info' }]) {
    withInput(JSON.stringify(value), file => {
      const result = run(file, '--service', 'never');
      assert.equal(result.status, 2);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /Line 1: expected an object/);
    });
  }
});
test('object-like service names are safe keys', () => {
  withInput('{"service":"__proto__","level":"error"}\n{"service":"constructor","level":"warn"}\n', file => {
    const result = run(file);
    assert.equal(result.status, 0);
    const counts = JSON.parse(result.stdout).byService;
    assert.equal(counts.__proto__, 1);
    assert.equal(counts.constructor, 1);
  });
});
test('missing file is a read error', () => {
  const result = run(join(root, 'does-not-exist.jsonl'));
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Cannot read input: ENOENT/);
});
test('invalid arguments are usage errors', () => {
  for (const args of [[], [sample,'--other','x'], [sample,'--service'], [sample,'--min-level','fatal'], [sample,'--service','a','--service','b']]) {
    const result = run(...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
  }
});
test('help succeeds without reading a file', () => {
  const result = run('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.equal(result.stderr, '');
});
