import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const login = process.argv[2] || 'bitfalt';
const out = fileURLToPath(new URL('../src/data/contributions.json', import.meta.url));
const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const raw = execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`, '-F', `login=${login}`], { encoding: 'utf8' });
const json = JSON.parse(raw);
const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
if (!cal || !Array.isArray(cal.weeks) || typeof cal.totalContributions !== 'number') {
  throw new Error(`Unexpected response from gh api graphql: ${raw.slice(0, 200)}`);
}
writeFileSync(out, JSON.stringify(json) + '\n');
const days = cal.weeks.flatMap(w => w.contributionDays);
console.log(`wrote ${out}: ${cal.totalContributions} contributions, ${days[0].date} to ${days.at(-1).date}`);
