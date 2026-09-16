import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const palettes = {
  light: { bg: 'e9edf5', title: '256b83', text: '3a4054', accent: '408774' },
  dark: { bg: '121622', title: '91d5e3', text: 'cdd3e0', accent: 'a4dfc6' },
};

export function validCard(result) {
  if (result?.status !== 'success' || !result.content?.includes('<svg') ||
      /Something went wrong|Could not fetch|DEPLOYMENT_(PAUSED|DISABLED)/i.test(result.content)) {
    throw new Error('Card generation failed; existing cards will be preserved.');
  }
  return result.content.replace(/[\t ]+$/gm, '').trim() + '\n';
}

const escape = (value) => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char]);

export function activitySvg(days, username, palette) {
  if (days.length !== 31 || days.some((day, index) =>
    !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isInteger(day.contributionCount) ||
    day.contributionCount < 0 || (index && Date.parse(day.date) - Date.parse(days[index - 1].date) !== 86400000))) {
    throw new Error('Expected 31 consecutive days of valid contribution data.');
  }
  const maximum = Math.max(4, ...days.map(day => day.contributionCount));
  const ceiling = Math.ceil(maximum / 4) * 4;
  const points = days.map((day, index) => [64 + index * 27.7, 244 - day.contributionCount / ceiling * 166]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const grid = Array.from({ length: 5 }, (_, i) => {
    const y = 244 - i * 41.5;
    return `<path d="M64 ${y}H895" stroke="#${palette.text}" opacity=".12"/><text x="49" y="${y + 4}" text-anchor="end">${ceiling * i / 4}</text>`;
  }).join('');
  const dots = points.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#${palette.accent}"><title>${days[i].date}: ${days[i].contributionCount} contributions</title></circle>`).join('');
  const labels = days.map((day, i) => i % 5 === 0 ? `<text x="${points[i][0]}" y="271" text-anchor="middle">${day.date.slice(5)}</text>` : '').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="304" viewBox="0 0 960 304" role="img" aria-labelledby="title desc">
<title id="title">${escape(username)}'s Contribution Graph</title>
<desc id="desc">${days[0].date} to ${days.at(-1).date}. ${days.map(day => `${day.date}: ${day.contributionCount}`).join('; ')}</desc>
<rect width="960" height="304" rx="22" fill="#${palette.bg}"/>
<g font-family="Segoe UI, Ubuntu, sans-serif" fill="#${palette.text}" font-size="12">
<text x="32" y="39" fill="#${palette.title}" font-size="20" font-weight="600">${escape(username)}'s Contribution Graph</text>
${grid}<polygon points="64,244 ${line} 895,244" fill="#${palette.title}" opacity=".1"/>
<polyline points="${line}" fill="none" stroke="#${palette.title}" stroke-width="2.5" stroke-linejoin="round"/>
${dots}${labels}</g></svg>`;
}

export async function generateCards({ username, core, days, save }) {
  // Collect and validate the complete batch before replacing any known-good asset.
  const cards = [];
  for (const [theme, palette] of Object.entries(palettes)) {
    const options = {
      username, hide_border: 'true', border_radius: '22', disable_animations: 'true',
      bg_color: palette.bg, title_color: palette.title, text_color: palette.text,
      icon_color: palette.accent, ring_color: palette.title,
    };
    cards.push([`stats-${theme}.svg`, validCard(await core.api({ ...options, show_icons: 'true' }))]);
    cards.push([`languages-${theme}.svg`, validCard(await core.topLangs({ ...options, layout: 'compact' }))]);
    cards.push([`activity-${theme}.svg`, activitySvg(days, username, palette)]);
  }
  for (const [name, svg] of cards) await save(name, svg);
  return cards.length;
}

async function main() {
  const username = process.env.GITHUB_REPOSITORY_OWNER || 'InkeyP';
  if (!/^[a-zA-Z0-9-]+$/.test(username)) throw new Error('Invalid GitHub username.');
  // Token remains in process memory; never put it in files, arguments, or logs.
  process.env.PAT_1 = process.env.GITHUB_TOKEN || execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  const core = await import('@stats-organization/github-readme-stats-core');
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30));
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
  const response = JSON.parse(execFileSync('gh', ['api', 'graphql', '--input', '-'], {
    input: JSON.stringify({ query, variables: { login: username, from: start.toISOString(), to: now.toISOString() } }),
    encoding: 'utf8', maxBuffer: 1024 * 1024,
  }));
  if (response.errors || !response.data?.user) throw new Error('GitHub did not return contribution data.');
  const days = response.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap(week => week.contributionDays)
    .filter(day => day.date >= start.toISOString().slice(0, 10) && day.date <= now.toISOString().slice(0, 10));
  const output = new URL('../assets/cards/', import.meta.url);
  const count = await generateCards({ username, core, days, save: async (name, svg) => {
    await mkdir(output, { recursive: true });
    await writeFile(new URL(name, output), svg);
  } });
  console.log(`Generated ${count} SVG cards in ${fileURLToPath(output)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('Card update failed. Existing assets were not replaced by error cards.');
    process.exitCode = 1;
  });
}
