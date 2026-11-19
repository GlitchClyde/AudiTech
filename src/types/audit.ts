export type Category = 'Phishing & Scam' | 'Transaction Receipts' | 'Account Logins' | 'Marketing Emails' | 'Distribution & Access' | 'Keep in Inbox';
export type AuthResult = 'pass' | 'fail' | 'none';
export type Status = 'INBOX' | 'ARCHIVED' | 'IN QUARANTINE BIN';
export interface MailMsg { id: string; fromName: string; from: string; replyTo?: string; subject: string; bodyHtml: string; auth: { spf: AuthResult; dkim: AuthResult; dmarc: AuthResult }; listUnsubscribe: boolean; attachments: string[]; }
export interface LinkInfo { text: string; href: string; mismatch: boolean; }
export interface Analysis { category: Category; riskScore: number; indicators: string[]; engine: 'PASS 1: HEURISTIC' | 'PASS 2: GEMINI'; text: string; links: LinkInfo[]; }
export interface Row { msg: MailMsg; a: Analysis; status: Status; humanVerified: boolean; prevStatus: Status; }
