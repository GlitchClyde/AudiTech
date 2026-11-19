import './styles/main.css';
import { MOCK } from './data/mockEmails';
import { analyze } from './engine/heuristics';
import type { Row, Status } from './types/audit';

const rows: Row[] = MOCK.map((msg) => {
  const a = analyze(msg);
  const status: Status = a.category === 'Phishing & Scam' ? 'IN QUARANTINE BIN' : ['Keep in Inbox', 'Distribution & Access'].includes(a.category) ? 'INBOX' : 'ARCHIVED';
  return { msg, a, status, humanVerified: false, prevStatus: 'INBOX' };
});
let filter = 'Quarantine Bin';
let selected: string | null = rows[0]?.msg.id ?? null;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; // textContent only: never innerHTML
}
const FILTERS = ['Quarantine Bin', 'All Audited', 'Transaction Receipts', 'Account Logins', 'Marketing Emails', 'Distribution & Access'];
const visible = () => rows.filter((r) => filter === 'All Audited' || (filter === 'Quarantine Bin' ? r.status === 'IN QUARANTINE BIN' : r.a.category === filter));
function move(r: Row, s: Status) { r.prevStatus = r.status; r.status = s; render(); }

function render(): void {
  const app = document.getElementById('app'); if (!app) return;
  app.replaceChildren();
  const bar = h('header', 'bar'); bar.append(h('b', 'brand', 'AUDITECH'), h('span', 'badge', 'SANDBOX')); app.append(bar);
  const q = rows.filter((r) => r.status === 'IN QUARANTINE BIN').length;
  const tel = h('div', 'tele');
  tel.append(h('span', '', `Total audited: ${rows.length}`), h('span', '', `In quarantine: ${q}`), h('span', '', `Archived: ${rows.filter((r) => r.status === 'ARCHIVED').length}`), h('span', '', 'Pass 1 local: 100%'));
  app.append(tel);
  const main = h('main', 'grid');
  const rail = h('nav', 'rail');
  for (const f of FILTERS) { const b = h('button', f === filter ? 'on' : '', f === 'Quarantine Bin' ? `${f} (${q})` : f); b.onclick = () => { filter = f; render(); }; rail.append(b); }
  const feed = h('section', 'feed');
  for (const r of visible()) {
    const row = h('div', `row${r.msg.id === selected ? ' sel' : ''}`);
    const pill = h('span', `pill ${r.a.riskScore >= 40 ? 'hi' : 'lo'}`, String(r.a.riskScore));
    row.append(pill, h('div', 'who', `${r.msg.fromName} <${r.msg.from}>`), h('div', 'subj', r.msg.subject), h('small', '', `${r.a.engine} · ${r.a.category} · ${r.status}`));
    row.onclick = () => { selected = r.msg.id; render(); };
    feed.append(row);
  }
  main.append(rail, feed, inspector()); app.append(main);
}

function inspector(): HTMLElement {
  const p = h('aside', 'insp'); const r = rows.find((x) => x.msg.id === selected);
  if (!r) { p.append(h('p', '', 'Select a message.')); return p; }
  const { msg, a } = r;
  p.append(h('h3', '', msg.subject), h('pre', 'mono', a.text));
  p.append(h('h4', '', 'Authentication'), h('div', 'mono', `SPF ${msg.auth.spf} · DKIM ${msg.auth.dkim} · DMARC ${msg.auth.dmarc}`), h('div', 'mono', `From ${msg.from} · Reply-To ${msg.replyTo ?? '(none)'}`));
  p.append(h('h4', '', 'Links (inert text)'));
  for (const l of a.links) p.append(h('div', `mono${l.mismatch ? ' bad' : ''}`, `${l.text} → ${l.href}`));
  p.append(h('h4', '', 'Threat indicators'));
  for (const i of a.indicators) p.append(h('div', 'bad', `• ${i}`));
  const acts = h('div', 'acts');
  const btn = (t: string, fn: () => void) => { const b = h('button', '', t); b.onclick = fn; acts.append(b); };
  if (r.status === 'IN QUARANTINE BIN') {
    btn('Restore to Inbox', () => move(r, 'INBOX'));
    btn(r.humanVerified ? 'Threat confirmed ✓' : 'Confirm Threat (keep in Trash)', () => { r.humanVerified = true; render(); });
  } else btn('Move to Quarantine Bin', () => move(r, 'IN QUARANTINE BIN'));
  p.append(acts); return p;
}
render();
