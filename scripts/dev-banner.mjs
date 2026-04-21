const p = process.env.DEV_PORT || "3000";
console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ Dentily — local dev (port ${p})                                     │
│                                                                  │
│ "Refused to connect" = nothing is listening. You MUST keep       │
│ this terminal open and wait for:  ✓ Ready                         │
│                                                                  │
│ 1) Stale process?   npm run free:3000                             │
│ 2) Start server:    npm run dev   (or npm run dev:boot)            │
│ 3) Next.js prints "Local: http://localhost:${p}" — that is OK.    │
│    Wait for ✓ Ready in this log, then open that URL (http only).  │
│    If the browser says refused for localhost, use                  │
│    http://127.0.0.1:${p} instead (macOS IPv6 quirk on some setups).│
│ 4) Still stuck?     npm run doctor   (with dev running)           │
│                                                                  │
│ If dev keeps crashing:                                           │
│   • npm run dev:safe   (more Node memory)                        │
│   • npm run preview    (production server — stable, no hot reload)│
│   • Move project out of iCloud Desktop → e.g. ~/dev/Dentily      │
│                                                                  │
│ Prefer macOS Terminal.app (not only the editor).                 │
└──────────────────────────────────────────────────────────────────┘
`);
