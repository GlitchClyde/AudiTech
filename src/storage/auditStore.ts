import type { Category, Status } from '../types/audit';
/** Sanitized metadata only. Never OAuth tokens, API keys, or full bodies. */
export interface VerdictRecord { id: string; category: Category; riskScore: number; indicators: string[]; engine: string; status: Status; humanVerified: boolean; labelsBefore: string[]; labelsAfter: string[]; snippet: string; ts: number; }
const DB = 'auditech', V = 'verdicts', W = 'whitelist', T = 'telemetry';
let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  dbp ??= new Promise((res, rej) => {
    const q = indexedDB.open(DB, 1);
    q.onupgradeneeded = () => { const d = q.result; d.createObjectStore(V, { keyPath: 'id' }); d.createObjectStore(W, { keyPath: 'sender' }); d.createObjectStore(T, { keyPath: 'key' }); };
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
  return dbp;
}
async function tx<R>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> {
  const d = await open();
  return new Promise((res, rej) => { const r = fn(d.transaction(store, mode).objectStore(store)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
export const putVerdict = (v: VerdictRecord) => tx(V, 'readwrite', (s) => s.put(v));
export const getVerdicts = () => tx<VerdictRecord[]>(V, 'readonly', (s) => s.getAll());
export const addWhitelist = (sender: string) => tx(W, 'readwrite', (s) => s.put({ sender, ts: Date.now() }));
export const getWhitelist = async (): Promise<string[]> => (await tx<{ sender: string }[]>(W, 'readonly', (s) => s.getAll())).map((x) => x.sender);
export const setCounter = (key: string, value: number) => tx(T, 'readwrite', (s) => s.put({ key, value }));
export const getCounters = () => tx<{ key: string; value: number }[]>(T, 'readonly', (s) => s.getAll());
