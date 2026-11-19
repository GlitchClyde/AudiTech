import type { MailMsg } from '../types/audit';
const ok = { spf: 'pass', dkim: 'pass', dmarc: 'pass' } as const;
export const MOCK: MailMsg[] = [
  { id: 'm1', fromName: 'GCash Support', from: 'alert@gcash-verify-ph.xyz', replyTo: 'help@mailbox-collect.ru', subject: 'Your wallet is LOCKED - verify now', bodyHtml: '<p>Dear user, your account is suspended. Confirm at <a href="http://185.22.9.4/login">www.gcash.com/verify</a> within 24h.</p>', auth: { spf: 'fail', dkim: 'fail', dmarc: 'fail' }, listUnsubscribe: false, attachments: ['verify.html'] },
  { id: 'm2', fromName: 'Google', from: 'no-reply@accounts.google.com', subject: 'Your verification code', bodyHtml: '<p>Your one-time code is 482913. Do not share it.</p>', auth: ok, listUnsubscribe: false, attachments: [] },
  { id: 'm3', fromName: 'Shopee PH', from: 'orders@shopee.ph', subject: 'Order confirmed: invoice attached', bodyHtml: '<p>Thanks! Your order confirmed. Official receipt #10293 for your records.</p>', auth: ok, listUnsubscribe: false, attachments: [] },
  { id: 'm4', fromName: 'Lazada Deals', from: 'promo@lazada.com.ph', subject: '11.11 mega sale: up to 70% off', bodyHtml: '<p>Huge savings this week only!</p>', auth: ok, listUnsubscribe: true, attachments: [] },
  { id: 'm5', fromName: 'Ana Reyes', from: 'ana@gmail.com', subject: 'Shared "Thesis Draft v3" with you', bodyHtml: '<p>Ana shared a document with you on Google Docs.</p>', auth: ok, listUnsubscribe: false, attachments: [] },
  { id: 'm6', fromName: 'Prof. Santos', from: 'santos@upou.edu.ph', subject: 'Meeting next week', bodyHtml: '<p>Can we meet Tuesday to discuss your midterm?</p>', auth: ok, listUnsubscribe: false, attachments: [] },
];
