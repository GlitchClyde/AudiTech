import { getToken } from './auth';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
async function call(path: string, body?: unknown): Promise<void> {
  const t = getToken();
  if (!t) throw new Error('Not connected');
  const r = await fetch(`${API}/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`Gmail ${r.status}`);
}
// No delete / batchDelete anywhere by design: everything stays recoverable.
export const quarantine = async (id: string, labelId: string) => { await call(`${id}/modify`, { addLabelIds: [labelId] }); await call(`${id}/trash`); };
export const restore = async (id: string) => { await call(`${id}/untrash`); await call(`${id}/modify`, { addLabelIds: ['INBOX'] }); };
export const archiveWithLabel = (id: string, labelId: string) => call(`${id}/modify`, { addLabelIds: [labelId], removeLabelIds: ['INBOX'] });
