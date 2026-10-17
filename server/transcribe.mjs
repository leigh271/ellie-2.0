import express from 'express';

const audioBody = express.raw({
  type: ['audio/*', 'application/octet-stream'],
  limit: '10mb',
});

const extensions = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
};

function parseAudio(req, res, next) {
  audioBody(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const tooLarge = error.status === 413 || error.type === 'entity.too.large';
    res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'audio_too_large' : 'invalid_audio' });
  });
}

export function registerTranscribeRoute(app, { allowAiRequest, getApiKey, model, fetchImpl = fetch }) {
  app.post('/api/ai/transcribe', parseAudio, async (req, res) => {
    const audio = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!audio.length) return res.status(400).json({ error: 'invalid_audio' });
    if (!allowAiRequest(req, res)) return;

    const apiKey = getApiKey();
    if (!apiKey) return res.status(503).json({ error: 'ai_unavailable' });

    const contentType = req.get('content-type') || 'application/octet-stream';
    const mimeType = contentType.split(';', 1)[0].trim().toLowerCase();
    const language = ['en', 'es', 'ht'].includes(req.query.language) ? req.query.language : 'en';
    const form = new FormData();
    form.append('file', new Blob([audio], { type: contentType }), `speech.${extensions[mimeType] ?? 'webm'}`);
    form.append('model', model);
    form.append('language', language);
    form.append('response_format', 'json');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}` },
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('transcription_unavailable');
      const body = await response.json();
      res.json({ text: typeof body.text === 'string' ? body.text.trim() : '' });
    } catch {
      res.status(503).json({ error: 'ai_unavailable' });
    } finally {
      clearTimeout(timer);
    }
  });
}
