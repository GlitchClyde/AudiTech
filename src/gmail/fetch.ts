import { gmail } from './client';
import type { AuthResult, MailMsg } from '../types/audit';
interface Part { headers?: { name: string; value: string }[]; mimeType?: string; body?: { data?: string }; filename?: string; parts?: Part[] }
interface Raw { id: string; payload?: Part }
const dec = (b64: string): string => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function walk(p: Part, o: { html: string; text: string; files: string[] }): void {
  if (p.filename) o.files.push(p.filename);
  const d = p.body?.data;
  if (d && !p.filename) { if (p.mimeType === 'text/html') o.html += dec(d); else if (p.mimeType === 'text/plain') o.text += dec(d); }
  for (const c of p.parts ?? []) walk(c, o);
}
const hv = (p: Part, n: string): string => p.headers?.find((h) => h.name.toLowerCase() === n)?.value ?? '';
const res = (ar: string, k: string): AuthResult => { const v = ar.match(new RegExp(`${k}=(\\w+)`, 'i'))?.[1]?.toLowerCase(); return v === 'pass' ? 'pass' : v === 'fail' || v === 'softfail' ? 'fail' : 'none'; };
const addr = (s: string): { name: string; email: string } => { const m = s.match(/^(.*?)\s*<([^>]+)>/); return m ? { name: (m[1] ?? '').replace(/"/g, '').trim(), email: (m[2] ?? '').trim() } : { name: '', email: s.trim() }; };

export async function fetchUnread(max = 25): Promise<MailMsg[]> {
  const list = await gmail<{ messages?: { id: string }[] }>(`messages?q=${encodeURIComponent('is:unread in:inbox')}&maxResults=${max}`);
  const out: MailMsg[] = [];
  for (const { id } of list.messages ?? []) {
    const p = (await gmail<Raw>(`messages/${id}?format=full`)).payload;
    if (!p) continue;
    const o = { html: '', text: '', files: [] as string[] };
    walk(p, o);
    const from = addr(hv(p, 'from')); const rt = hv(p, 'reply-to'); const ar = hv(p, 'authentication-results');
    out.push({ id, fromName: from.name || from.email, from: from.email, replyTo: rt ? addr(rt).email : undefined, subject: hv(p, 'subject') || '(no subject)', bodyHtml: o.html || `<p>${esc(o.text)}</p>`, auth: { spf: res(ar, 'spf'), dkim: res(ar, 'dkim'), dmarc: res(ar, 'dmarc') }, listUnsubscribe: !!hv(p, 'list-unsubscribe'), attachments: o.files });
  }
  return out;
}
