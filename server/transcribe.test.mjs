import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTranscribeRoute } from './transcribe.mjs';

let server;
let baseUrl;

async function startServer(options) {
  const app = express();
  registerTranscribeRoute(app, options);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

beforeEach(async () => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  server = undefined;
});

describe('POST /api/ai/transcribe', () => {
  it('returns 503 when AI is not configured', async () => {
    const fetchImpl = vi.fn();
    await startServer({
      allowAiRequest: (_req, res) => {
        res.status(503).json({ error: 'ai_unavailable' });
        return false;
      },
      getApiKey: () => undefined,
      model: 'test-transcriber',
      fetchImpl,
    });
    const response = await fetch(`${baseUrl}/api/ai/transcribe?language=en`, {
      method: 'POST',
      headers: { 'content-type': 'audio/webm' },
      body: Buffer.from('audio'),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ai_unavailable' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an empty audio body', async () => {
    await startServer({
      allowAiRequest: vi.fn(() => true),
      getApiKey: () => 'test-key',
      model: 'test-transcriber',
    });
    const response = await fetch(`${baseUrl}/api/ai/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'audio/webm' },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_audio' });
  });

  it('returns JSON 413 for an oversized body', async () => {
    await startServer({
      allowAiRequest: vi.fn(() => true),
      getApiKey: () => 'test-key',
      model: 'test-transcriber',
    });
    const response = await fetch(`${baseUrl}/api/ai/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'audio/webm' },
      body: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'audio_too_large' });
  });

  it('forwards multipart audio fields and returns trimmed text', async () => {
    let sentUrl;
    let sentOptions;
    const fetchImpl = vi.fn(async (url, options) => {
      sentUrl = url;
      sentOptions = options;
      return new Response(JSON.stringify({ text: '  Hola, Ellie. \n' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    await startServer({
      allowAiRequest: vi.fn(() => true),
      getApiKey: () => 'test-key',
      model: 'test-transcriber',
      fetchImpl,
    });
    const response = await fetch(`${baseUrl}/api/ai/transcribe?language=es`, {
      method: 'POST',
      headers: { 'content-type': 'audio/mp4' },
      body: Buffer.from('audio-bytes'),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: 'Hola, Ellie.' });
    expect(sentUrl).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(sentOptions.headers).toEqual({ authorization: 'Bearer test-key' });
    expect(sentOptions.body.get('model')).toBe('test-transcriber');
    expect(sentOptions.body.get('language')).toBe('es');
    expect(sentOptions.body.get('response_format')).toBe('json');
    const file = sentOptions.body.get('file');
    expect(file.name).toBe('speech.m4a');
    expect(file.type).toBe('audio/mp4');
    expect(await file.text()).toBe('audio-bytes');
  });
});
