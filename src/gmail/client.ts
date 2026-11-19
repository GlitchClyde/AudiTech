import { getToken } from './auth';
const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
export async function gmail<R>(path: string, init: { method?: string; body?: unknown } = {}): Promise<R> {
  const t = getToken();
  if (!t) throw new Error('Not connected');
  const r = await fetch(`${BASE}/${path}`, { method: init.method ?? 'GET', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: init.body ? JSON.stringify(init.body) : undefined });
  if (!r.ok) throw new Error(`Gmail API ${r.status}`);
  return (await r.json()) as R;
}
