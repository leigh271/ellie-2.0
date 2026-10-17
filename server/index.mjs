import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const app = express();
const port = Number(process.env.PORT || 8787);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshots = path.join(root, 'server', 'snapshots');
app.use(express.json({ limit: '1mb' }));

const routes = [
  { method: 'GET', pattern: /^\/api\/c3\/survivors$/, url: 'https://c3-rough-patch.zay-259.workers.dev/api/c3/survivors', snapshot: 'c3/survivors.json', timeout: 8000 },
  { method: 'GET', pattern: /^\/api\/c3\/metrics$/, url: 'https://c3-rough-patch.zay-259.workers.dev/api/c3/metrics', snapshot: 'c3/metrics.json', timeout: 8000 },
  { method: 'GET', pattern: /^\/api\/c3\/survivors\/([^/]+)$/, url: (m) => `https://c3-rough-patch.zay-259.workers.dev/api/c3/survivors/${encodeURIComponent(m[1])}`, snapshot: (m) => `c3/${m[1]}.json`, timeout: 8000 },
  { method: 'GET', pattern: /^\/api\/c4\/survivors$/, url: 'https://c4-glucose-guide.zay-259.workers.dev/api/c4/survivors', snapshot: 'c4/survivors.json', timeout: 8000 },
  { method: 'GET', pattern: /^\/api\/c4\/cohort$/, url: 'https://c4-glucose-guide.zay-259.workers.dev/api/c4/cohort', snapshot: 'c4/cohort.json', timeout: 8000 },
  { method: 'GET', pattern: /^\/api\/c4\/survivors\/([^/]+)\/advice$/, url: (m) => `https://c4-glucose-guide.zay-259.workers.dev/api/c4/survivors/${encodeURIComponent(m[1])}/advice`, snapshot: null, timeout: 20000 },
  { method: 'GET', pattern: /^\/api\/c4\/survivors\/([^/]+)$/, url: (m) => `https://c4-glucose-guide.zay-259.workers.dev/api/c4/survivors/${encodeURIComponent(m[1])}`, snapshot: (m) => `c4/${m[1]}.json`, timeout: 8000 },
  { method: 'GET', pattern: /^\/api\/c5\/demo-calls$/, url: 'https://coach.raava.dev/demo-calls.json', snapshot: 'c5/demo-calls.json', timeout: 8000 },
  { method: 'POST', pattern: /^\/api\/c5\/(turn|review|cue)$/, url: (m) => `https://coach.raava.dev/api/${m[1]}`, timeout: 20000 },
];

async function snapshotResponse(file, res) {
  if (!file) return false;
  try {
    const body = await readFile(path.join(snapshots, file), 'utf8');
    res.set('x-ellie-source', 'snapshot').type('application/json').send(body);
    return true;
  } catch {
    return false;
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'ellie-api', offline: process.env.ELLIE_OFFLINE === '1' }));

for (const route of routes) {
  app[route.method.toLowerCase()](route.pattern, async (req, res) => {
    const match = req.path.match(route.pattern);
    if (process.env.ELLIE_OFFLINE === '1' && route.method === 'GET') {
      if (await snapshotResponse(typeof route.snapshot === 'function' ? route.snapshot(match) : route.snapshot, res)) return;
      return res.status(503).json({ error: 'No snapshot is available for this endpoint.' });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), route.timeout);
    try {
      const response = await fetch(typeof route.url === 'function' ? route.url(match) : route.url, {
        method: route.method,
        headers: route.method === 'POST' ? { 'content-type': 'application/json' } : undefined,
        body: route.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
      res.set('x-ellie-source', 'live').status(response.status).send(await response.text());
    } catch (error) {
      if (route.method === 'GET' && await snapshotResponse(typeof route.snapshot === 'function' ? route.snapshot(match) : route.snapshot, res)) return;
      res.status(503).json({ error: error instanceof Error ? error.message : 'Upstream service unavailable.' });
    } finally {
      clearTimeout(timer);
    }
  });
}

app.use(express.static(path.join(root, 'dist')));
app.get('*', (_req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  res.sendFile(path.join(root, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Ellie API listening on http://0.0.0.0:${port}${process.env.ELLIE_OFFLINE === '1' ? ' (snapshot mode)' : ''}`);
});
