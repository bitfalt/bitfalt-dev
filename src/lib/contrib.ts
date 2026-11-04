import raw from '../data/contributions.json';

export interface Day { date: string; n: number; level: 0 | 1 | 2 | 3 | 4 }
export interface Grid {
  total: number;
  weeks: Day[][];
  best: Day;
  monthCols: { col: number; month: number }[];
}

interface CalendarJson {
  data: { user: { contributionsCollection: { contributionCalendar: {
    totalContributions: number;
    weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
  } } } };
}

export function contribGrid(json: CalendarJson = raw): Grid {
  const cal = json.data.user.contributionsCollection.contributionCalendar;
  const counts = cal.weeks.flatMap(w => w.contributionDays.map(d => d.contributionCount));
  const sorted = counts.filter(n => n > 0).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))] ?? 0;
  const [c1, c2, c3] = [q(0.25), q(0.5), q(0.8)];
  const level = (n: number): Day['level'] => (n === 0 ? 0 : n <= c1 ? 1 : n <= c2 ? 2 : n <= c3 ? 3 : 4);
  const weeks = cal.weeks.map(w => w.contributionDays.map(d => ({ date: d.date, n: d.contributionCount, level: level(d.contributionCount) })));
  const best = weeks.flat().reduce((a, b) => (b.n > a.n ? b : a));
  const monthCols = weeks.flatMap((w, col) => {
    const first = w.find(d => d.date.endsWith('-01'));
    return first ? [{ col, month: Number(first.date.slice(5, 7)) - 1 }] : [];
  });
  return { total: cal.totalContributions, weeks, best, monthCols };
}
