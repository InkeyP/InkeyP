import { readFile, writeFile } from 'node:fs/promises';

// Core 2.1.3 requests the stargazer connection just to count stars. GitHub now
// restricts that connection for installation tokens; the public scalar returns
// the same count without requesting the list of users who starred a repo.
// https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/
export function usePublicStarCount(source) {
  const connection = /stargazers\s*\{\s*totalCount\s*\}/g;
  const access = /\.stargazers\.totalCount/g;
  if (!source.includes('stargazers') && source.includes('stargazerCount')) return source;
  if ([...source.matchAll(connection)].length !== 1 || [...source.matchAll(access)].length !== 2) {
    throw new Error('Stats core changed; review the star-count compatibility patch.');
  }
  return source.replace(connection, 'stargazerCount').replace(access, '.stargazerCount');
}

export async function patchStatsCore() {
  const file = new URL('./fetchers/stats.js', import.meta.resolve('@stats-organization/github-readme-stats-core'));
  const source = await readFile(file, 'utf8');
  const patched = usePublicStarCount(source);
  if (patched !== source) await writeFile(file, patched);
}
