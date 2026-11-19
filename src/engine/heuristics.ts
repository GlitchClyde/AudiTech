import type { Analysis, Category, LinkInfo, MailMsg } from '../types/audit';
const BRANDS = ['gcash', 'bdo', 'bpi', 'maya', 'paypal', 'google', 'microsoft', 'university', 'it support'];
const BAD_EXT = ['.html', '.htm', '.iso', '.exe', '.scr', '.js', '.vbs', '.zip'];
const domainOf = (addr: string): string => addr.split('@')[1]?.toLowerCase() ?? '';
const hostOf = (u: string): string => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };

/** Parses hostile HTML in a detached document: nothing is attached to the live DOM, nothing executes. */
export function parseBody(html: string): { text: string; links: LinkInfo[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const links: LinkInfo[] = [];
  doc.querySelectorAll('a[href]').forEach((a) => {
    const text = (a.textContent ?? '').trim();
    const href = a.getAttribute('href') ?? '';
    const shown = text.match(/[a-z0-9-]+(\.[a-z0-9-]+)+/i)?.[0]?.toLowerCase();
    const host = hostOf(href);
    links.push({ text, href, mismatch: !!shown && !!host && !host.endsWith(shown.replace(/^www\./, '')) });
  });
  return { text: (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 3000), links };
}

export function analyze(m: MailMsg): Analysis {
  const { text, links } = parseBody(m.bodyHtml);
  const ind: string[] = [];
  let score = 0;
  const add = (pts: number, why: string) => { score += pts; ind.push(why); };
  const fd = domainOf(m.from);
  if (m.auth.spf === 'fail') add(25, 'SPF failed');
  if (m.auth.dkim === 'fail') add(25, 'DKIM failed');
  if (m.auth.dmarc === 'fail') add(30, 'DMARC failed');
  if (m.replyTo && domainOf(m.replyTo) !== fd) add(20, `Reply-To domain (${domainOf(m.replyTo)}) differs from From (${fd})`);
  const name = m.fromName.toLowerCase();
  const brand = BRANDS.find((b) => name.includes(b));
  if (brand && !fd.includes(brand.replace(/\s/g, ''))) add(30, `Display name impersonates "${brand}" from ${fd}`);
  for (const l of links) {
    if (l.mismatch) add(25, `Link text "${l.text}" points to ${hostOf(l.href)}`);
    const h = hostOf(l.href);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) add(25, `Raw IP link: ${h}`);
    if (h.includes('xn--')) add(25, `Punycode homoglyph domain: ${h}`);
  }
  for (const f of m.attachments) if (BAD_EXT.some((e) => f.toLowerCase().endsWith(e))) add(30, `High-risk attachment: ${f}`);
  score = Math.min(100, score);

  let category: Category = score >= 40 ? 'Phishing & Scam' : 'Keep in Inbox';
  if (score === 0) {
    const t = `${m.subject} ${text}`.toLowerCase();
    if (/verification code|one-time|otp|sign-in|password reset|2fa/.test(t)) category = 'Account Logins';
    else if (/receipt|invoice|official receipt|payment (received|confirmation)|order (confirmed|shipped)/.test(t)) category = 'Transaction Receipts';
    else if (/shared .* with you|invited you|calendar invitation|repository|access granted/.test(t)) category = 'Distribution & Access';
    else if (m.listUnsubscribe) category = 'Marketing Emails';
  }
  return { category, riskScore: score, indicators: ind, engine: 'PASS 1: HEURISTIC', text, links };
}
