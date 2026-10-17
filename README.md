# Ellie · Survivorship Care Demo

Ellie is a fictional, end-to-end hackathon demo for survivorship care navigation. It combines a role-aware patient and provider experience with three separate challenge cohorts. It is not a clinical product.

## Run locally

Requirements: Node 24 and npm 10.

```sh
npm install
npm run dev
```

The Vite app is available at [http://localhost:5173](http://localhost:5173) and the Express API is on port 8787. `npm run dev` binds Vite to `0.0.0.0` and starts both processes.

```sh
npm run typecheck
npm test
npm run build
npm run build && npm start
```

`npm start` serves the built app and API on port 8787. Set `ELLIE_OFFLINE=1` when starting the server to force bundled challenge snapshots:

```sh
ELLIE_OFFLINE=1 npm start
```

## Five-minute demo walkthrough

1. Open the command center and point out that the six-patient Ellie roster is fictional and separate from the C3/C4/C5 synthetic challenge cohorts.
2. Open Maria Rodriguez’s Patient 360. Select **Wearables** to record the Understand step and review the transparent local rule, baseline charts and data completeness.
3. In the insight card, mark the signal reviewed; then create the prefilled Health coach follow-up with the patient-safe update. It appears in Care coordination and advances the Care Loop to Act.
4. Switch to **Patient** in the top role switcher. Maria sees the shared update, can acknowledge it, and can submit a wellness check-in that is visible to the care team. A Low check-in creates an attention item.
5. Return to **Provider**, open the task, document an outcome and close it. The Care Loop reaches Follow up and the action appears in Activity & reports.
6. Optionally review the separate C3 Rough Patch Radar and C4 Glucose Guide cohorts, then select a C5 expert-labelled call to show the MI score, safety flags and supervisor review.

## Architecture

- **Frontend:** React 18 + TypeScript + Vite + React Router (hash routing); Recharts; plain CSS based on `docs/reference/ellie-prototype.html`.
- **Provider / patient state:** React context and `localStorage` (`ellie-demo-v1`), with a `storage` listener for cross-tab updates. Demo reset restores seeded tasks and loop states.
- **Ellie demo data:** deterministic fictional 42-day wearable series and patient context in `src/data/ellieDemo.ts`. The local rough-patch rule is separately implemented in `src/lib/roughPatch.ts`.
- **Challenge proxy:** Express on port 8787; Vite proxies `/api` to Express. Successful upstream requests carry `x-ellie-source: live`; bundled fallback responses use `snapshot`.
- **Privacy boundary:** Patient role routes to Maria’s patient view only. Internal notes, provider fidelity scores and other patient records are not rendered there. C3/C4/C5 IDs are never connected to an Ellie patient record.

## Challenge integration status

| Challenge | Endpoints used | CORS / proxy | Live vs snapshot fallback |
| --- | --- | --- | --- |
| C3 · Rough Patch Radar | `GET /api/c3/survivors`, `/api/c3/metrics`, `/api/c3/survivors/:id` | External worker requests are server-side via Express; browser calls same-origin `/api`. | Live worker response or `server/snapshots/c3/{survivors,metrics,<id>}.json`; `ELLIE_OFFLINE=1` forces snapshots. |
| C4 · Glucose Guide | `GET /api/c4/survivors`, `/api/c4/cohort`, `/api/c4/survivors/:id`, `/api/c4/survivors/:id/advice` | External worker requests are server-side via Express; browser calls same-origin `/api`. | List/cohort/details fall back to `server/snapshots/c4`; on-demand advice has no snapshot and returns a service error when unavailable. |
| C5 · Coach’s Co-pilot | `GET /api/c5/demo-calls`; `POST /api/c5/turn`, `/review`, `/cue` | Coach API does not provide browser CORS; all calls are proxied via Express. | Calls fall back to `server/snapshots/c5/demo-calls.json`. Turn/review/cue have no snapshots; classifier failure shows the supplied expert labels with an error banner. |

All proxy GETs use an 8-second timeout (advice and C5 review/cue use 20 seconds). A failed upstream response or timeout falls back to JSON snapshots where available. Successful upstream responses are labelled Live API; challenge snapshot responses are labelled Snapshot.

## Simulated vs live

| Feature | Status |
| --- | --- |
| Six Ellie patient profiles, wearable charts, rough-patch rule and care loop | Simulated deterministic demo data; persisted in local browser storage. Not the C3 model. |
| Patient check-ins, support-resource sharing, task assignment, patient-safe updates, supervisor review, activity log | Local demo workflows only; no real messaging, referrals, scheduling or EHR connection. |
| C3 survivor list/detail/model metrics | Live challenge worker when reachable; snapshot fallback is provided. Independent synthetic cohort. |
| C4 glucose details, cohort effects and advice draft | Live challenge worker when reachable; list/cohort/detail snapshots are provided. Advice has no snapshot. Observational, not causal. |
| C5 call recordings and expert labels | Supplied synthetic snapshot if live call feed unavailable. Calls are not linked to Ellie patients. |
| C5 turn classification, review and cue | Live proxied API only; no snapshot. Expert labels and local trigger rules remain available if the API fails. |
| Ellie patient companion | Local keyword/rule-based responses; no LLM. Clinical and urgent concerns are routed to the care team / emergency guidance. |

## Safety and limitations

This prototype uses fictional/synthetic information, is not clinically validated or HIPAA-compliant, and is not connected to a real messaging or EHR system. C4 patterns are observational and do not establish causation. AI-generated wording and other suggestions require human review. For an emergency, contact emergency services.
