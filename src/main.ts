import './styles/main.css';
import { MOCK } from './data/mockEmails';
import { analyze } from './engine/heuristics';
import type { Row, Status } from './types/audit';
import { addWhitelist, getVerdicts, getWhitelist, putVerdict, setCounter } from './storage/auditStore';
import { connect } from './gmail/auth';
import { ensureLabels } from './gmail/labels';

const rows: Row[] = MOCK.map((msg) => {
  const a = analyze(msg);
  const status: Status = a.category === 'Phishing & Scam' ? 'IN QUARANTINE BIN' : ['Keep in Inbox', 'Distribution & Access'].includes(a.category) ? 'INBOX' : 'ARCHIVED';
  return { msg, a, status, humanVerified: false, prevStatus: 'INBOX' };
});
let filter = 'Quarantine Bin';
let live = false; let drawer = false; let note = ''; let whitelist: string[] = [];
let selected: string | null = rows[0]?.msg.id ?? null;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; // textContent only: never innerHTML
}
const FILTERS = ['Quarantine Bin', 'All Audited', 'Transaction Receipts', 'Account Logins', 'Marketing Emails', 'Distribution & Access', 'Trusted Domains'];
const visible = () => rows.filter((r) => filter === 'All Audited' || (filter === 'Quarantine Bin' ? r.status === 'IN QUARANTINE BIN' : r.a.category === filter));
const snap = (s: Status): string[] => (s === 'INBOX' ? ['INBOX'] : s === 'ARCHIVED' ? [] : ['TRASH']);
function persist(r: Row): void {
  void putVerdict({ id: r.msg.id, category: r.a.category, riskScore: r.a.riskScore, indicators: r.a.indicators, engine: r.a.engine, status: r.status, humanVerified: r.humanVerified, labelsBefore: snap(r.prevStatus), labelsAfter: snap(r.status), snippet: r.a.text.slice(0, 200), ts: Date.now() });
}
function move(r: Row, s: Status) { r.prevStatus = r.status; r.status = s; persist(r); render(); }
async function init(): Promise<void> {
  try {
    whitelist = await getWhitelist();
    for (const v of await getVerdicts()) { const r = rows.find((x) => x.msg.id === v.id); if (r) { r.status = v.status; r.humanVerified = v.humanVerified; } }
    for (const r of rows) persist(r);
    await setCounter('audited', rows.length);
  } catch { note = 'IndexedDB unavailable; running without persistence.'; }
  render();
}
function drawerEl(): HTMLElement {
  const d = h('div', 'drawer'); d.append(h('h3', '', 'Settings'));
  const field = (label: string, key: string) => { const i = h('input'); i.type = 'password'; i.value = sessionStorage.getItem(key) ?? ''; i.oninput = () => sessionStorage.setItem(key, i.value); d.append(h('label', '', label), i); };
  field('Google OAuth Client ID', 'au_cid'); field('Gemini API Key', 'au_gem');
  const c = h('button', 'conn', 'Connect Gmail & create labels');
  c.onclick = async () => { try { await connect(sessionStorage.getItem('au_cid') ?? ''); const m = await ensureLabels(); live = true; note = `Connected. ${Object.keys(m).length} labels ready.`; } catch (e) { note = e instanceof Error ? e.message : 'Connect failed'; } render(); };
  d.append(c, h('p', 'mono', note), h('p', 'mono', 'Keys live in this tab (sessionStorage) and are cleared when it closes.'));
  return d;
}

function render(): void {
  const app = document.getElementById('app'); if (!app) return;
  app.replaceChildren();
  const bar = h('header', 'bar'); bar.append(h('b', 'brand', 'AUDITECH'), h('span', `badge${live ? ' liveb' : ''}`, live ? 'LIVE GMAIL' : 'SANDBOX'));
  const sb = h('button', '', 'Settings'); sb.onclick = () => { drawer = !drawer; render(); }; bar.append(sb); app.append(bar);
  const q = rows.filter((r) => r.status === 'IN QUARANTINE BIN').length;
  const tel = h('div', 'tele');
  tel.append(h('span', '', `Total audited: ${rows.length}`), h('span', '', `In quarantine: ${q}`), h('span', '', `Archived: ${rows.filter((r) => r.status === 'ARCHIVED').length}`), h('span', '', 'Pass 1 local: 100%'));
  app.append(tel);
  const main = h('main', 'grid');
  const rail = h('nav', 'rail');
  for (const f of FILTERS) { const b = h('button', f === filter ? 'on' : '', f === 'Quarantine Bin' ? `${f} (${q})` : f); b.onclick = () => { filter = f; render(); }; rail.append(b); }
  const feed = h('section', 'feed');
  if (filter === 'Trusted Domains') for (const w of whitelist) feed.append(h('div', 'row mono', w));
  for (const r of visible()) {
    const row = h('div', `row${r.msg.id === selected ? ' sel' : ''}`);
    const pill = h('span', `pill ${r.a.riskScore >= 40 ? 'hi' : 'lo'}`, String(r.a.riskScore));
    row.append(pill, h('div', 'who', `${r.msg.fromName} <${r.msg.from}>`), h('div', 'subj', r.msg.subject), h('small', '', `${r.a.engine} · ${r.a.category} · ${r.status}`));
    row.onclick = () => { selected = r.msg.id; render(); };
    feed.append(row);
  }
  main.append(rail, feed, inspector()); app.append(main); if (drawer) app.append(drawerEl());
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
    btn('Trust Sender & Restore', () => { const d = r.msg.from; if (!whitelist.includes(d)) whitelist.push(d); void addWhitelist(d); move(r, 'INBOX'); });
    btn(r.humanVerified ? 'Threat confirmed ✓' : 'Confirm Threat (keep in Trash)', () => { r.humanVerified = true; persist(r); render(); });
  } else btn('Move to Quarantine Bin', () => move(r, 'IN QUARANTINE BIN'));
  p.append(acts); return p;
}
void init();
