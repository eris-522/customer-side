@[../AGENTS.md](../AGENTS.md)

# Customer Portal (`customer-side/`) Context

Key entry points and files in this sub-repository:
- `src/App.tsx` — Client router and top-level layout/providers.
- `src/pages/BookingPage.tsx` — 5-step booking engine (dates, Leaflet venue pin & stairs hauling, course limits, corkage, digital signature, deposit receipt upload).
- `src/pages/MyInquiriesPage.tsx` — Client inquiry tracker, 15-day balance settlement, milestone installments, 14-day modification requests, and 24-hour post-event feedback.
- `src/context/CMSContext.tsx` — Real-time CMS content and announcement banner synchronization.
- `vite.config.ts` — Vite build config and `/api/google-maps` middleware (`api/google-maps.js`).
