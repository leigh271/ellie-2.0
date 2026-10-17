import { Link, useSearchParams } from 'react-router-dom';
import { AppCard, PageHeading } from '../components';
import { RESOURCE_CATEGORIES, resources } from '../content/resources';
import type { ResourceCategory } from '../content/resources';
import { useLanguage } from '../useLanguage';

const categoryLabel = {
  transportation: 'resourceTransportation',
  emotional: 'resourceEmotional',
  local: 'resourceLocal',
} as const;

const categorySub = {
  transportation: 'homeTransportationSub',
  emotional: 'homeEmotionalSub',
  local: 'homeLocalSub',
} as const;

function categoryFromParam(value: string | null): ResourceCategory | undefined {
  return RESOURCE_CATEGORIES.find((category) => category === value);
}

export default function ResourcesScreen() {
  const [searchParams] = useSearchParams();
  const { language, messages } = useLanguage();
  const category = categoryFromParam(searchParams.get('category'));
  const visible = category ? resources.filter((resource) => resource.categories.includes(category)) : resources;

  return <div className="patient-app-screen patient-app-resources-screen">
    <PageHeading
      title={category ? messages[categoryLabel[category]] : messages.resourceHeading}
      subtitle={category ? messages[categorySub[category]] : messages.needResources}
      language={language}
    />
    <nav className="patient-app-resource-filters" aria-label={messages.resourceHeading}>
      <Link className={!category ? 'active' : ''} to="/app/resources">{messages.resourceAll}</Link>
      {RESOURCE_CATEGORIES.map((item) => <Link key={item} className={category === item ? 'active' : ''} to={`/app/resources?category=${item}`}>{messages[categoryLabel[item]]}</Link>)}
    </nav>
    {visible.length ? <div className="patient-app-resource-cards">
      {visible.map((resource) => {
        const content = resource.content[language];
        return <Link key={resource.id} to={`/app/resources/${resource.id}`} className="patient-app-resource-card">
          <span className="patient-app-resource-card-copy"><strong>{content.title}</strong><small>{content.description}</small></span>
          <span aria-hidden="true">›</span>
        </Link>;
      })}
    </div> : <AppCard title={messages.resourceHeading} text={messages.resourceEmpty} language={language}><p className="patient-app-empty">{messages.resourceEmpty}</p></AppCard>}
    <p className="patient-app-resource-note">{messages.resourceDetailsChange}</p>
  </div>;
}
