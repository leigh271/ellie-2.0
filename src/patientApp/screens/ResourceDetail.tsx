import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon, PageHeading } from '../components';
import { getResource } from '../content/resources';
import type { ResourceCategory } from '../content/resources';
import { useLanguage } from '../useLanguage';
import { SpeakButton } from '../useSpeech';

const BOOKMARKS_KEY = 'ellie-patient-resource-bookmarks';
const categoryLabel = {
  transportation: 'resourceTransportation',
  emotional: 'resourceEmotional',
  local: 'resourceLocal',
} as const;

function readBookmarks(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export default function ResourceDetailScreen() {
  const { resourceId = '' } = useParams();
  const resource = getResource(resourceId);
  const { language, messages } = useLanguage();
  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const [feedback, setFeedback] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const content = resource?.content[language];
  const saved = Boolean(resource && bookmarks.includes(resource.id));
  const category = resource?.categories[0] as ResourceCategory | undefined;

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 2400);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const toggleBookmark = () => {
    if (!resource) return;
    const next = saved ? bookmarks.filter((id) => id !== resource.id) : [...bookmarks, resource.id];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    setBookmarks(next);
    if (!saved) setFeedback(messages.resourceSaved);
  };
  const share = async () => {
    if (!resource) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: resource.content[language].title, url });
      } catch {
        // A dismissed share sheet needs no fallback.
      }
      return;
    }
    setShareBusy(true);
    try {
      await navigator.clipboard.writeText(url);
      setFeedback(messages.resourceLinkCopied);
    } catch {
      setFeedback(url);
    } finally {
      setShareBusy(false);
    }
  };

  if (!resource || !content) return <div className="patient-app-screen"><PageHeading title={messages.resourceHeading} subtitle={messages.resourceEmpty} language={language} /></div>;

  const applyText = resource.phoneLabel ? content.apply.replace(resource.phoneLabel, '').trim() : content.apply;
  const speechText = `${content.title}. ${content.description}. ${content.who}. ${content.services.join('. ')}. ${content.apply}`;

  return <div className="patient-app-screen patient-app-resource-detail">
    <div className="patient-app-resource-toolbar">
      <Link className="patient-app-resource-back" to={`/app/resources?category=${category ?? 'local'}`} aria-label={messages.resourceBack}><Icon name="arrowLeft" size={20} /></Link>
      <div className="patient-app-resource-actions">
        <SpeakButton text={speechText} language={language} className="patient-app-icon-button" />
        <button type="button" className={`patient-app-icon-button ${saved ? 'is-saved' : ''}`} onClick={toggleBookmark} aria-label={saved ? messages.resourceRemoveBookmark : messages.resourceBookmark}><Icon name="bookmark" size={20} /></button>
        <button type="button" className="patient-app-icon-button" onClick={share} disabled={shareBusy} aria-label={messages.resourceShare}><Icon name="share" size={20} /></button>
      </div>
    </div>
    <section className={`patient-app-resource-hero icon-${resource.icon}`} data-speech-text={speechText}>
      <span className="patient-app-resource-category">{messages[categoryLabel[category ?? 'local']]}</span>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
    </section>
    {feedback && <p className="patient-app-resource-feedback" role="status" aria-live="polite">{feedback}</p>}
    <section className="patient-app-resource-info">
      <article className="patient-app-resource-info-card">
        <span className="patient-app-resource-info-icon"><Icon name="user" size={20} /></span>
        <div><h2>{messages.resourceWho}</h2><p>{content.who}</p></div>
      </article>
      <article className="patient-app-resource-info-card">
        <span className="patient-app-resource-info-icon"><Icon name="book" size={20} /></span>
        <div><h2>{messages.resourceServices}</h2><ul>{content.services.map((service) => <li key={service}>{service}</li>)}</ul></div>
      </article>
      <article className="patient-app-resource-info-card">
        <span className="patient-app-resource-info-icon"><Icon name="phone" size={20} /></span>
        <div><h2>{messages.resourceHowApply}</h2><p>{applyText}</p>
          {resource.phoneHref && resource.phoneLabel && <a className="patient-app-phone-link" href={resource.phoneHref}>{resource.phoneLabel}</a>}
        </div>
      </article>
    </section>
    {resource.helpNeed
      ? <Link className="patient-app-primary patient-app-resource-cta" to={`/app/help?need=${resource.helpNeed}`}>{messages.resourceAskTeam}</Link>
      : resource.url && <a className="patient-app-primary patient-app-resource-cta" href={resource.url} target="_blank" rel="noopener noreferrer">{messages.resourceVisit}<Icon name="external" size={18} /></a>}
    <p className="patient-app-resource-note">{messages.resourceDetailsChange}</p>
  </div>;
}
