import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(process.env.ELLIE_CDP_URL ?? 'http://localhost:29229');
const context = await browser.newContext();
await context.addInitScript(() => {
  const voices = [
    { name: 'English (United States)', lang: 'en-US', default: true },
    { name: 'Spanish (United States)', lang: 'es-US', default: false },
    { name: 'French (France)', lang: 'fr-FR', default: false },
  ];
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.lang = '';
      this.voice = null;
      this.rate = 1;
    }
  };
  window.__ellieSpeechCalls = [];
  window.speechSynthesis.getVoices = () => voices;
  window.speechSynthesis.cancel = () => {};
  window.speechSynthesis.speak = (utterance) => {
    window.__ellieSpeechCalls.push({ text: utterance.text, lang: utterance.lang });
  };
});

const page = await context.newPage();
await page.goto('http://localhost:5173/#/app');
const openAsPatient = page.getByRole('button', { name: 'Open as patient' });
if (await openAsPatient.count()) await openAsPatient.click();
const maybeLater = page.getByRole('button', { name: 'Maybe later' });
await maybeLater.waitFor({ state: 'visible', timeout: 5000 });
if (await maybeLater.count()) await maybeLater.click();
await page.getByRole('button', { name: 'Profile and settings' }).click();
await page.locator('.patient-app-profile-sheet select').first().selectOption('ana');
await page.locator('.patient-app-profile-sheet select').nth(1).selectOption('es');
await page.locator('.patient-app-profile-sheet .patient-app-card-header button').click();
await page.locator('.patient-app-home-topic').first().click();
await page.locator('.patient-app-page-heading .speak-button').click();
await page.waitForFunction(() => window.__ellieSpeechCalls?.length > 0);
const speech = await page.evaluate(() => window.__ellieSpeechCalls.at(-1));
if (speech.lang !== 'es-US') throw new Error(`Expected es-US speech, received ${speech.lang}`);
console.log(`TTS language verified: ${speech.lang} · "${speech.text.slice(0, 70)}…"`);
await page.close();
await context.close();
process.exit(0);
