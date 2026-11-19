import { gmail } from './client';
export const LABELS: { name: string; bg: string }[] = [
  { name: 'Auditech/Phishing & Scam', bg: '#fb4c2f' },
  { name: 'Auditech/Transaction Receipts', bg: '#fad165' },
  { name: 'Auditech/Account Logins', bg: '#a4c2f4' },
  { name: 'Auditech/Marketing Emails', bg: '#b694e8' },
  { name: 'Auditech/Distribution & Access', bg: '#42d692' },
];
interface L { id: string; name: string }
/** Lists labels, creates any missing Auditech label, returns name -> labelId. */
export async function ensureLabels(): Promise<Record<string, string>> {
  const have = (await gmail<{ labels?: L[] }>('labels')).labels ?? [];
  const map: Record<string, string> = {};
  for (const l of LABELS) {
    const hit = have.find((x) => x.name === l.name);
    if (hit) { map[l.name] = hit.id; continue; }
    const c = await gmail<L>('labels', { method: 'POST', body: { name: l.name, labelListVisibility: 'labelShow', messageListVisibility: 'show', color: { backgroundColor: l.bg, textColor: '#000000' } } });
    map[l.name] = c.id;
  }
  return map;
}
