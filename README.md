# Auditech
Zero-backend, local-first Gmail phishing triage (TypeScript + Vite).
```
npm install && npm run dev      # sandbox demo works with no credentials
npm run build
```
**Security model:** client-side only; OAuth scope `gmail.modify` only (no permanent delete, ever); threats go to Gmail Trash + label (reversible);
email HTML is parsed in a detached DOM and shown as plain text; links are inert text; token kept in memory; strict CSP in `index.html`.
**Not wired yet:** live Gmail fetch, label bootstrapper, Gemini Pass 2 (prompt-injection fenced), IndexedDB audit store, settings drawer, security modal.
