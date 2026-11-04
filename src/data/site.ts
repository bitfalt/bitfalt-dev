export type Lang = 'en' | 'es';
export type Text = { en: string; es: string };
export type YearMonth = `${number}-${number}`;
export type Link = { label: string; url: string };

export type Where = 'remoteFT' | 'cr';
export type Entry = 'solo' | 'team' | 'fullgame';
export type Result = 'winner' | 'pending' | null;

export interface Person {
  name: string;
  handle: string;
  email: string;
  summary: Text;
  country: string;
  skills: string[];
  study: { degree: string; school: string; schoolName: string; start: YearMonth; end: YearMonth | null };
}

export interface Social {
  label: 'GitHub' | 'LinkedIn' | 'X';
  url: string;
  short: string;
}

export interface Experience {
  id: string;
  org: string;
  role: string;
  start: YearMonth;
  end: YearMonth | null;
  where: Where | null;
  summary?: Text;
  bullets: Text[];
  links: Link[];
}

export interface OpenSource {
  id: string;
  name: string;
  repo: string;
  stars: number | null;
  url: string;
  pr: string | null;
  date: YearMonth | null;
  own?: true;
  code?: string;
  note?: Text;
  what: Text;
}

export interface Hackathon {
  id: string;
  name: string;
  event: string;
  date: YearMonth;
  result: Result;
  win?: 'both';
  entry: Entry | null;
  bullets: Text[];
  links: Link[];
}

export interface ArchiveEntry {
  id: string;
  name: string;
  event: string | null;
  what: Text | null;
  url: string;
}

export interface Talk {
  n: number;
  slug: `stellar-sessions-${number}`;
  title: string;
  slides: number;
  what: Text;
}

export const person: Person = {
  name: 'Daniel Garbanzo',
  handle: 'bitfalt',
  email: 'dagarbanz@proton.me',
  summary: {
    en: 'Software engineer building AI and trading infrastructure in Rust. Background in product engineering, automation, OSS, blockchain, and developer tooling.',
    es: 'Ingeniero de software que construye infraestructura de IA y trading en Rust. Experiencia en ingeniería de producto, automatización, OSS, blockchain y herramientas para desarrolladores.',
  },
  country: 'Costa Rica',
  skills: ['Rust', 'TypeScript', 'Python', 'Go', 'C++', 'Bash', 'React', 'Next.js', 'GCP', 'infra', 'developer tools', 'Claude Code', 'Codex'],
  study: { degree: 'M.S. Computer Science', school: 'TEC', schoolName: 'Instituto Tecnológico de Costa Rica', start: '2026-02', end: null },
};

export const socials: Social[] = [
  { label: 'GitHub', url: 'https://github.com/bitfalt', short: 'github.com/bitfalt' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/daniel-garbanzo/', short: 'linkedin.com/in/daniel-garbanzo' },
  { label: 'X', url: 'https://x.com/bitfalt', short: 'x.com/bitfalt' },
];

export const experience: Experience[] = [
  {
    id: 'nexus', org: 'Nexus', role: 'Backend Engineer', start: '2026-06', end: null, where: 'remoteFT',
    summary: { en: 'Backend work on the Nexus exchange and its AI platform.', es: 'Backend del exchange de Nexus y de su plataforma de IA.' },
    bullets: [
      { en: 'Built the exchange’s market maker in Rust, deployed it across 4 Kubernetes environments, and cut quote-update latency by 75%.',
        es: 'Construí el market maker del exchange en Rust, lo desplegué en 4 entornos de Kubernetes y bajé 75% la latencia de actualización de cotizaciones.' },
      { en: 'Added open-weight models to Nexus’s AI gateway, routing each call to the cheapest available host with automatic failover.',
        es: 'Agregué modelos open-weight al AI gateway de Nexus: cada llamada va al host disponible más barato, con failover automático.' },
      { en: 'Built an automated API test harness that caught 13 defects before release, including a release blocker.',
        es: 'Construí un arnés automatizado de pruebas de API que atrapó 13 defectos antes del release, incluido uno que bloqueaba el release.' },
    ],
    links: [],
  },
  {
    id: 'dojo', org: 'Dojo Coding', role: 'Software Engineer', start: '2025-07', end: '2026-08', where: 'remoteFT',
    bullets: [
      { en: 'Built and shipped features across Dojo Coding’s product ecosystem and agentic development initiatives: builder onboarding, technical talent evaluation and developer-facing products.',
        es: 'Construí y lancé funcionalidades en el ecosistema de productos de Dojo Coding y sus iniciativas de desarrollo agéntico: onboarding de builders, evaluación de talento técnico y productos para desarrolladores.' },
      { en: 'Created developer tooling for agent workflows, setup diagnostics and structured project execution.',
        es: 'Creé herramientas para flujos de trabajo con agentes, diagnóstico de setup y ejecución estructurada de proyectos.' },
      { en: 'Main author (36 commits) of code-sensei, a Claude Code plugin that teaches programming while you vibecode.',
        es: 'Autor principal (36 commits) de code-sensei, un plugin de Claude Code que enseña a programar mientras hacés vibecoding.' },
    ],
    links: [{ label: 'code-sensei', url: 'https://github.com/DojoCodingLabs/code-sensei' }],
  },
  {
    id: 'equifax', org: 'Equifax', role: 'RPA Intern', start: '2025-06', end: '2025-11', where: 'cr',
    bullets: [
      { en: 'Built automation scripts that cut recurring daily processes from 2 to 4 hours down to 5 minutes.',
        es: 'Construí scripts de automatización que bajaron procesos diarios recurrentes de 2 a 4 horas a 5 minutos.' },
    ],
    links: [],
  },
  {
    id: 'mindvault', org: 'MindVault', role: 'Engineering Co-Founder', start: '2024-12', end: '2025-03', where: 'cr',
    bullets: [
      { en: 'Co-founded and built MindVault, an assessment app about personality, beliefs and cognition. 2,000+ users in under a week, 500,000+ impressions, 4,000+ concurrent sessions.',
        es: 'Cofundé y construí MindVault, una app de evaluación sobre personalidad, creencias y cognición. Más de 2,000 usuarios en menos de una semana, más de 500,000 impresiones y más de 4,000 sesiones concurrentes.' },
    ],
    links: [],
  },
  {
    id: 'onlydust', org: 'OnlyDust', role: 'OSS Contributor and Maintainer', start: '2024-05', end: '2025-10', where: null,
    bullets: [
      { en: 'Ranked 61st of 8,000+ contributors on OnlyDust.', es: 'Puesto 61 de más de 8,000 contribuidores en OnlyDust.' },
    ],
    links: [],
  },
];

export const oss: OpenSource[] = [
  { id: 'kakarot', name: 'Kakarot zkEVM', repo: 'kkrt-labs/kakarot-ssj', stars: 132, code: 'eth_chain_id', url: 'https://github.com/kkrt-labs/kakarot-ssj/pull/932', pr: '#932', date: '2024-09',
    what: { en: 'Added the eth_chain_id entrypoint.', es: 'Agregué el entrypoint eth_chain_id.' } },
  { id: 'scaffold-stark-2', name: 'Scaffold-Stark 2', repo: 'Scaffold-Stark/scaffold-stark-2', stars: 109, url: 'https://github.com/Scaffold-Stark/scaffold-stark-2/pull/302', pr: '#302', date: '2024-10',
    what: { en: 'Reconciled the hooks example with main.', es: 'Reconcilié el ejemplo de hooks con main.' } },
  { id: 'create-soroban-dapp', name: 'create-soroban-dapp', repo: 'paltalabs/create-soroban-dapp', stars: 36, code: 'airdropAccount', url: 'https://github.com/paltalabs/create-soroban-dapp/pull/23', pr: '#23', date: '2024-07',
    what: { en: 'Made airdropAccount support standalone networks.', es: 'Hice que airdropAccount soporte redes standalone.' } },
  { id: 'carbon-protocol', name: 'Carbon Protocol v3', repo: 'carbonable-labs/carbon-protocol-v3', stars: null, url: 'https://github.com/carbonable-labs/carbon-protocol-v3/pull/78', pr: '#78', date: '2024-06',
    what: { en: 'Added access control to the smart contract.', es: 'Agregué control de acceso al smart contract.' } },
  { id: 'cofiblocks', name: 'CofiBlocks', repo: 'Vagabonds-Labs/cofiblocks', stars: null, url: 'https://github.com/Vagabonds-Labs/cofiblocks/pull/95', pr: '#95', date: '2024-12',
    note: { en: 'Costa Rica coffee marketplace on Starknet', es: 'marketplace de café de Costa Rica en Starknet' },
    what: { en: 'Deployed the contracts to Starknet Sepolia and fixed ERC1155 tests.', es: 'Desplegué los contratos en Starknet Sepolia y arreglé los tests de ERC1155.' } },
  { id: 'scaffold-stellar-agentic', name: 'scaffold-stellar-agentic', repo: 'bitfalt/scaffold-stellar-agentic', own: true, stars: 5, url: 'https://github.com/bitfalt/scaffold-stellar-agentic', pr: null, date: null,
    what: { en: 'From idea to dApp with prompts. Scaffold Stellar, Trustless Work escrows, Cavos email login, and skills for any coding agent.',
      es: 'De la idea a la dApp con prompts. Scaffold Stellar, escrows de Trustless Work, login con correo de Cavos y skills para cualquier agente de código.' } },
];

export const hackathons: Hackathon[] = [
  {
    id: 'paralock', name: 'Paralock', event: 'Colosseum Crypto World’s Fair', date: '2026-10', result: 'pending', entry: null,
    bullets: [
      { en: 'Trustless swaps between shielded ZEC and stablecoins on EVM chains. One lock on each chain, one secret opens both. No bridge, no custodian.',
        es: 'Swaps trustless entre ZEC blindado y stablecoins en cadenas EVM. Un candado en cada cadena, un secreto abre los dos. Sin bridge, sin custodio.' },
      { en: 'A full swap on public testnets in 3 min 39 s. Escrow contracts on 6 EVM testnets. TypeScript SDK on npm and Rust SDK on crates.io that trade on the same wire protocol. Private mode with adaptor signatures.',
        es: 'Un swap completo en testnets públicas en 3 min 39 s. Contratos de escrow en 6 testnets EVM. SDK de TypeScript en npm y SDK de Rust en crates.io que hablan el mismo protocolo. Modo privado con adaptor signatures.' },
    ],
    links: [{ label: 'paralock.xyz', url: 'https://paralock.xyz' }, { label: 'GitHub', url: 'https://github.com/bitfalt/paralock' }],
  },
  {
    id: 'sigilo', name: 'Sigilo', event: 'Monad Metropolis', date: '2026-10', result: 'pending', entry: 'solo',
    bullets: [
      { en: 'Private payroll in stablecoins. Workers prove their income in zero knowledge and take salary advances repaid from payroll. Tagline: “The original proof of work.”',
        es: 'Planilla privada en stablecoins. Quien trabaja prueba sus ingresos en zero knowledge y pide adelantos de salario que se pagan desde la planilla. Lema: “The original proof of work.”' },
      { en: 'Noir circuit (about 9,400 gates) proved in the browser in about 6 s. Passkey accounts, no seed phrase. Live on Monad testnet.',
        es: 'Circuito en Noir (unas 9,400 compuertas) probado en el navegador en unos 6 s. Cuentas con passkey, sin seed phrase. En vivo en la testnet de Monad.' },
    ],
    links: [{ label: 'sigilo.work', url: 'https://sigilo.work' }, { label: 'GitHub', url: 'https://github.com/bitfalt/Sigilo' }],
  },
  {
    id: 'gacha-desk', name: 'Gacha Desk', event: 'PayBox Chapter 1 (MoonPay)', date: '2026-10', result: null, entry: null,
    bullets: [
      { en: 'A PayBox agent plugin for Collector Crypt card packs on Base. The agent ranks packs by expected value, odds and buyback, then reserves, pays, opens or sells back. Every step needs your passkey.',
        es: 'Un plugin de agente para PayBox con sobres de cartas de Collector Crypt en Base. El agente ordena los sobres por valor esperado, probabilidades y recompra; luego reserva, paga, abre o revende. Cada paso pide tu passkey.' },
    ],
    links: [],
  },
  {
    id: 'veilescrow', name: 'VeilEscrow', event: 'ETHPuraVida Hackathon', date: '2024-10', result: 'winner', entry: 'team',
    bullets: [
      { en: 'An anonymous escrow marketplace. Semaphore groups hide wallet addresses. Chainlink VRF picks participants fairly. Wallet or email login through thirdweb.',
        es: 'Un marketplace de escrow anónimo. Los grupos de Semaphore esconden las direcciones de wallet. Chainlink VRF escoge participantes de forma justa. Login con wallet o correo vía thirdweb.' },
      { en: 'Top contributor on the team (38 commits).', es: 'Mayor contribuidor del equipo (38 commits).' },
    ],
    links: [{ label: 'GitHub', url: 'https://github.com/evgongora/VeilEscrow' }],
  },
  {
    id: 'buildmyevent', name: 'BuildMyEvent', event: 'Base LATAM Buildathon', date: '2024-10', result: 'winner', entry: 'team',
    bullets: [
      { en: 'A no-code platform to create event pages and sell tickets on Base.', es: 'Una plataforma sin código para crear páginas de eventos y vender tiquetes en Base.' },
      { en: 'Wrote the smart contracts.', es: 'Escribí los smart contracts.' },
    ],
    links: [{ label: 'GitHub org', url: 'https://github.com/BuildMyEvent' }, { label: 'smart contracts', url: 'https://github.com/BuildMyEvent/BuildMyEvent-SmartContracts' }],
  },
  {
    id: 'echoes-of-the-void', name: 'Echoes of the Void', event: 'Dojo Game Jam VI', date: '2025-06', result: null, entry: 'fullgame',
    bullets: [
      { en: 'A minimalist on-chain exploration game on Starknet with the Dojo Engine. Chambers are dark. You send sound pulses to reveal walls and the exit. Every move is an on-chain transaction.',
        es: 'Un juego minimalista de exploración on-chain en Starknet con Dojo Engine. Las cámaras están a oscuras. Enviás pulsos de sonido para revelar paredes y la salida. Cada movimiento es una transacción on-chain.' },
    ],
    links: [{ label: 'GitHub', url: 'https://github.com/bitfalt/echoes-of-the-void' }, { label: 'submission', url: 'https://github.com/dojoengine/game-jams/pull/137' }],
  },
  {
    id: 'parquiz', name: 'ParQuiz', event: 'Dojo Game Jam VIII', date: '2026-03', result: 'winner', win: 'both', entry: 'team',
    bullets: [
      { en: 'A multiplayer Parchís-style trivia game on Starknet with Dojo. Matchmaking, private lobbies, VRF dice and on-chain rules.',
        es: 'Un juego multijugador de trivia al estilo Parchís en Starknet con Dojo. Matchmaking, salas privadas, dados con VRF y reglas on-chain.' },
      { en: 'Won prizes in both tracks: the General Track and the Embeddable Game Standard Track.',
        es: 'Ganó premios en ambas categorías: General Track y Embeddable Game Standard Track.' },
      { en: 'Team of two. 69 commits from me, 78 from Ritx10.', es: 'Equipo de dos. 69 commits míos, 78 de Ritx10.' },
    ],
    links: [
      { label: 'parquiz.vercel.app', url: 'https://parquiz.vercel.app' },
      { label: 'GitHub', url: 'https://github.com/Ritx10/Parquiz' },
      { label: 'submission', url: 'https://github.com/dojoengine/game-jams/pull/311' },
    ],
  },
];

export const archive: ArchiveEntry[] = [
  { id: 'cerberus', name: 'Cerberus', event: 'AgentKit Hackathon',
    what: { en: 'Human-in-the-loop agent governance with World ID, x402 and XMTP.', es: 'Gobernanza de agentes con humano en el loop, con World ID, x402 y XMTP.' },
    url: 'https://github.com/bitfalt/cerberus' },
  { id: 'ecoproof', name: 'EcoProof', event: 'Trustless Work (Boundless) hackathon', what: null, url: 'https://github.com/bitfalt/EcoProof' },
  { id: 'aegis', name: 'Aegis', event: 'Synthesis Hackathon', what: null, url: 'https://github.com/bitfalt/synthesis-hackathon' },
  { id: 'nansen-query-planner', name: 'Nansen Mini Hackathon', event: null,
    what: { en: 'NansenCLI query planner.', es: 'Planificador de consultas para NansenCLI.' },
    url: 'https://github.com/bitfalt/nansen-query-planner' },
];

export const talks: Talk[] = [
  { n: 1, slug: 'stellar-sessions-1', title: 'De cero a tu dApp en Stellar', slides: 61,
    what: { en: 'Crash course plus Scaffold Stellar workshop.', es: 'Curso intensivo más taller de Scaffold Stellar.' } },
  { n: 2, slug: 'stellar-sessions-2', title: 'x402 en Stellar', slides: 39,
    what: { en: 'HTTP 402, x402 and MPP: what it is and why it matters now.', es: 'HTTP 402, x402 y MPP: qué es y por qué importa ahora.' } },
  { n: 3, slug: 'stellar-sessions-3', title: 'Web3 es difícil (y no debería serlo)', slides: 22,
    what: { en: 'Onboarding friction, Stellar fixes and Costa Rica use cases.', es: 'La fricción del onboarding, cómo la resuelve Stellar y casos de uso en Costa Rica.' } },
];

export const SECTIONS = ['experience', 'oss', 'hackathons', 'talks', 'writing'] as const;
export type Section = (typeof SECTIONS)[number];

export const deckHref = (t: Talk) => `/talks/${t.slug}`;
export const coverSrc = (t: Talk) => `/img/talks/${t.slug}-01.jpg`;

const newestFirst = (a: Hackathon, b: Hackathon) => b.date.localeCompare(a.date);

export interface HackathonGroups {
  winners: Hackathon[];
  pending: Hackathon[];
  rest: Hackathon[];
}

export function hackathonGroups(list: Hackathon[] = hackathons): HackathonGroups {
  return {
    winners: list.filter(h => h.result === 'winner').sort(newestFirst),
    pending: list.filter(h => h.result === 'pending').sort(newestFirst),
    rest: list.filter(h => h.result === null).sort(newestFirst),
  };
}

export function hackathonsByWins(list: Hackathon[] = hackathons): Hackathon[] {
  const g = hackathonGroups(list);
  return [...g.winners, ...g.pending, ...g.rest];
}

export const currentJob = experience.find(e => e.end === null)!;
export const winnerCount = hackathonGroups().winners.length;
export const bothTracks = hackathons.find(h => h.win === 'both')!;
