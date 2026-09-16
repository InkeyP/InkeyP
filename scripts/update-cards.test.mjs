import test from 'node:test';
import assert from 'node:assert/strict';
import { activitySvg, generateCards, palettes, validCard } from './update-cards.mjs';
import { readFile } from 'node:fs/promises';
import { usePublicStarCount } from './update-cards-compat.mjs';

test('pinned stats core uses the public star count and the patch is idempotent', async () => {
  const source = await readFile(new URL('./fetchers/stats.js', import.meta.resolve('@stats-organization/github-readme-stats-core')), 'utf8');
  const patched = usePublicStarCount(source);
  assert.doesNotMatch(patched, /stargazers/);
  assert.match(patched, /node\.stargazerCount/);
  assert.match(patched, /curr\.stargazerCount/);
  assert.equal(usePublicStarCount(patched), patched);
  assert.throws(() => usePublicStarCount('stargazers { totalCount } changed upstream'));
});

const days = Array.from({ length: 31 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 7, 1 + i)).toISOString().slice(0, 10), contributionCount: 0,
}));

test('an error in the last card does not replace any existing assets', async () => {
  let calls = 0;
  const writes = [];
  const render = async () => ++calls === 4
    ? { status: 'error - temporary', content: '<svg>Something went wrong</svg>' }
    : { status: 'success', content: '<svg></svg>' };
  await assert.rejects(generateCards({ username: 'InkeyP', core: { api: render, topLangs: render },
    days, save: async (...args) => writes.push(args) }));
  assert.deepEqual(writes, []);
});

test('successful generation writes all six theme variants', async () => {
  const render = async () => ({ status: 'success', content: '<svg></svg>' });
  const writes = [];
  assert.equal(await generateCards({ username: 'InkeyP', core: { api: render, topLangs: render },
    days, save: async name => writes.push(name) }), 6);
  assert.equal(new Set(writes).size, 6);
});

test('empty activity produces a valid flat graph; corrupt data is rejected', () => {
  const svg = activitySvg(days, 'InkeyP', palettes.light);
  assert.ok(!/NaN|Infinity/.test(svg));
  assert.match(svg, /2026-08-31: 0/);
  assert.throws(() => activitySvg(days.slice(1), 'InkeyP', palettes.light));
  assert.throws(() => activitySvg(days.map(day => ({ ...day, contributionCount: -1 })), 'InkeyP', palettes.light));
  assert.throws(() => validCard({ status: 'success', content: '<svg>Something went wrong</svg>' }));
});
