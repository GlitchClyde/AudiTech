const SCOPE = 'https://www.googleapis.com/auth/gmail.modify'; // least privilege: never https://mail.google.com/
interface TokenResp { access_token?: string; error?: string }
interface TokenClient { requestAccessToken(): void }
declare const google: { accounts: { oauth2: { initTokenClient(c: { client_id: string; scope: string; callback: (r: TokenResp) => void }): TokenClient } } };
let token: string | null = null; // memory only: never localStorage/IndexedDB
export const getToken = (): string | null => token;
export const disconnect = (): void => { token = null; };
function loadGis(): Promise<void> {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.onload = () => res(); s.onerror = () => rej(new Error('GIS failed to load'));
    document.head.appendChild(s);
  });
}
export async function connect(clientId: string): Promise<void> {
  await loadGis();
  await new Promise<void>((res, rej) => {
    google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: SCOPE, callback: (r) => { if (r.access_token) { token = r.access_token; res(); } else rej(new Error(r.error ?? 'auth failed')); } }).requestAccessToken();
  });
}
