import { experience, hackathonGroups, talks, type Lang } from '../data/site';
import { ui } from '../i18n';

export type CommandKey = 'experience' | 'oss' | 'hackathons' | 'talks' | 'writing' | 'heat';
export interface SectionCommand { cmd: string; out: string[] }

const ids = (list: { id: string }[]) => list.map(h => h.id);

export function sectionCommand(key: CommandKey, lang: Lang, postCount = 0): SectionCommand {
  const t = ui[lang];
  switch (key) {
    case 'experience':
      return { cmd: 'ls ~/work -t', out: [experience.map(e => (e.id === 'dojo' ? 'dojo-coding/' : `${e.id}/`)).join('  ')] };
    case 'oss':
      return { cmd: 'git log --author=bitfalt --oneline', out: ['932  kakarot-ssj: add eth_chain_id entrypoint', '302  scaffold-stark-2: reconcile hooks example with main', t.ossMore] };
    case 'hackathons': {
      const g = hackathonGroups();
      return {
        cmd: 'ls ~/hackathons --sort=wins',
        out: [`★ ${ids(g.winners).join('  ★ ')}  ${t.hackAwards}`, `${ids(g.pending).join('  ')}  ${t.hackPending}`, ids(g.rest).join('  ')],
      };
    }
    case 'talks':
      return { cmd: 'ls ~/talks', out: [`${talks.map(k => `${k.slug}/`).join('  ')}  ${t.talksNote}`] };
    case 'writing':
      return { cmd: 'ls ~/writing', out: [`total ${postCount}`] };
    case 'heat':
      return { cmd: 'gh contributions --last-year', out: [] };
  }
}
