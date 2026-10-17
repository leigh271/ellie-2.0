import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { buildPatientContext } from './patientContext.mjs';

const app = express();
const port = Number(process.env.PORT || 8787);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshots = path.join(root, 'server', 'snapshots');
const aiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const aiRequestsByIp = new Map();
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

app.get('/api/ai/status', (_req, res) => {
  res.json({ enabled: Boolean(process.env.OPENAI_API_KEY), model: aiModel });
});

const languageNames = { en: 'English', es: 'Spanish', ht: 'Haitian Creole' };
const patientChatPrompt = (languageName) => `You are Ellie, a warm survivorship-care companion for a cancer survivor using a hospital demo app. Reply in ${languageName} at about a 6th-grade reading level, in 2–5 short sentences. You give general education and help people prepare questions for their care team, find support (rides, costs, food, emotional support, caregiver help) and understand health words. You never diagnose, never change or recommend medication doses, and never interpret test results as normal or abnormal for this person; say their care team can explain what it means for them. If the person mentions chest pain, trouble breathing, heavy bleeding, fever over 100.4°F (38°C) during or soon after treatment, thoughts of self-harm, or another emergency, tell them to call 911 or their care team now, and for self-harm mention calling or texting 988. Do not claim to be a doctor or a real person. Do not mention other patients.`;
const explainPrompt = (languageName, length) => `You explain a cancer diagnosis and care phase to a patient in ${languageName}. Use plain language at a 6th-grade reading level, in ${length}. Describe what the condition is in general and what this care phase usually involves. Do not give a prognosis, statistics, or treatment advice, and end by suggesting one question to ask the care team. This is general education, not about this specific person.`;
const summaryPrompt = "You write a brief pre-visit summary for a survivorship care team in English. Use only the data provided. Output 3–5 bullet points, then one line starting 'Suggested follow-up:'. Describe observations as associations, never causes. Name which source each observation comes from (fatigue study wearable record, NHANES exam record, synthetic coaching record). State that the linked records come from different study participants combined into a demo profile. Do not diagnose or recommend medication changes.";

function allowAiRequest(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: 'ai_unavailable' });
    return false;
  }
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const recent = (aiRequestsByIp.get(ip) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 30) {
    aiRequestsByIp.set(ip, recent);
    res.status(429).json({ error: 'rate_limited' });
    return false;
  }
  recent.push(now);
  aiRequestsByIp.set(ip, recent);
  return true;
}

async function requestOpenAI(systemPrompt, messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        temperature: 0.3,
        max_tokens: 500,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('upstream_unavailable');
    const body = await response.json();
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('upstream_unavailable');
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

function requestLanguage(value) {
  return Object.hasOwn(languageNames, value) ? value : 'en';
}

function safeText(value, maximum = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function safeStringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 20).map((item) => safeText(item, 500)) : [];
}

async function linkedChatContext(patientId) {
  if (!patientId) return undefined;
  try {
    const linkedFile = await readFile(path.join(root, 'public', 'data', 'patient_links.json'), 'utf8');
    const linkedRecord = JSON.parse(linkedFile).patients?.[patientId];
    return linkedRecord ? buildPatientContext(linkedRecord) : undefined;
  } catch {
    return undefined;
  }
}

app.post('/api/ai/chat', async (req, res) => {
  if (!allowAiRequest(req, res)) return;
  const body = req.body ?? {};
  const patientId = safeText(body.patientId, 40);
  const messages = Array.isArray(body.messages)
    ? body.messages
      .filter((message) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.text === 'string')
      .slice(-12)
      .map((message) => ({ role: message.role, content: safeText(message.text, 4000) }))
      .filter((message) => message.content)
    : [];
  if (!messages.length) return res.status(400).json({ error: 'invalid_request' });
  const languageName = languageNames[requestLanguage(body.language)];
  try {
    const linkedContext = await linkedChatContext(patientId);
    const contextNote = linkedContext
      ? `\n\nHere are this person's linked demo records, in JSON: ${JSON.stringify(linkedContext)}. These records come from different research participants and were combined into one fictional demo profile. When the person asks about their activity, sleep, health numbers or coaching goals, answer from these records in plain words, give the numbers, and say which record they come from (fatigue-study wearable record, NHANES exam record, or synthetic coaching record). Do not say whether a number is normal, good or bad for them, and do not diagnose; suggest asking the care team what it means for them. If the records don't contain the answer, say so.`
      : '';
    const reply = await requestOpenAI(`${patientChatPrompt(languageName)}${contextNote}`, messages);
    res.json({ reply, source: 'openai' });
  } catch {
    res.status(503).json({ error: 'ai_unavailable' });
  }
});

app.post('/api/ai/explain', async (req, res) => {
  if (!allowAiRequest(req, res)) return;
  const body = req.body ?? {};
  const language = requestLanguage(body.language);
  const diagnosis = safeText(body.diagnosis, 300);
  const phase = safeText(body.phase, 300);
  const mode = body.mode === 'full' ? 'full' : 'simple';
  if (!diagnosis || !phase) return res.status(400).json({ error: 'invalid_request' });
  const length = mode === 'simple' ? '3 short sentences' : '2 short paragraphs';
  try {
    const text = await requestOpenAI(explainPrompt(languageNames[language], length), [
      { role: 'user', content: JSON.stringify({ diagnosis, phase }) },
    ]);
    res.json({ text });
  } catch {
    res.status(503).json({ error: 'ai_unavailable' });
  }
});

app.post('/api/ai/summary', async (req, res) => {
  if (!allowAiRequest(req, res)) return;
  const body = req.body ?? {};
  const patientId = safeText(body.patientId, 40);
  const patient = body.patient && typeof body.patient === 'object' ? body.patient : {};
  const summaryContext = {
    patient: {
      name: safeText(patient.name, 120),
      diagnosis: safeText(patient.diagnosis, 300),
      phase: safeText(patient.phase, 200),
      goals: safeStringList(patient.goals),
      needs: safeStringList(patient.needs),
    },
    patientId,
  };
  try {
    const linkedFile = await readFile(path.join(root, 'public', 'data', 'patient_links.json'), 'utf8');
    const linkedPatients = JSON.parse(linkedFile).patients;
    const linkedRecords = linkedPatients?.[patientId];
    if (!patientId || !linkedRecords) throw new Error('linked_records_unavailable');
    const summary = await requestOpenAI(summaryPrompt, [
      { role: 'user', content: JSON.stringify({ ...summaryContext, linkedRecords }) },
    ]);
    res.json({ summary });
  } catch {
    res.status(503).json({ error: 'ai_unavailable' });
  }
});

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
