import type { ReactNode } from 'react';
import {
  CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { DataSource } from '../lib/api';
import type { DatasetKind } from '../data/datasets';

export function Orb() { return <span className="orb" aria-hidden="true" />; }

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'pink' | 'warn' | 'good' | 'danger' }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function SourceBadge({ source }: { source: DataSource }) {
  return <Pill tone={source === 'live' ? 'good' : source === 'snapshot' ? 'warn' : 'pink'}>{source === 'live' ? 'Live API' : source === 'snapshot' ? 'Snapshot' : 'Simulated'}</Pill>;
}

export function SourceNote({ kind, citation, population, caveat }: {
  kind: DatasetKind;
  citation: string;
  population?: string;
  caveat?: string;
}) {
  return <div className="dataset-source-note">
    <div className="tag-row"><Pill tone={kind === 'real' ? 'good' : 'pink'}>{kind === 'real' ? 'Real research data' : 'Synthetic'}</Pill>{kind === 'real' && <span className="tiny muted">Not Ellie patients</span>}</div>
    <p className="tiny dataset-citation">{citation}</p>
    {population && <p className="tiny muted">{population}</p>}
    {caveat && <p className="tiny muted">{caveat}</p>}
  </div>;
}

export function DatasetCard({ title, kind, citation, population, caveat, children, span = 6 }: {
  title: string;
  kind: DatasetKind;
  citation: string;
  population?: string;
  caveat?: string;
  children: ReactNode;
  span?: number;
}) {
  return <Tile span={span} title={title} className="dataset-card">
    <SourceNote kind={kind} citation={citation} population={population} caveat={caveat} />
    <div className="dataset-card-content">{children}</div>
  </Tile>;
}

export function Tile({ children, className = '', span = 6, hero = false, title, actions, badge }: {
  children: ReactNode;
  className?: string;
  span?: number;
  hero?: boolean;
  title?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <article className={`tile span${span}${hero ? ' hero' : ''} ${className}`}>
      {(title || actions || badge) && <div className="head"><div className="title-row">{title && <h2>{title}</h2>}{badge}</div>{actions}</div>}
      {children}
    </article>
  );
}

export function BentoGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bento ${className}`}>{children}</div>;
}

export function Stat({ value, label, note }: { value: ReactNode; label: string; note?: string }) {
  return <div><span className="small muted">{label}</span><div className="stat">{value}</div>{note && <p className="tiny muted">{note}</p>}</div>;
}

export function LoadingTile({ title = 'Loading data' }: { title?: string }) {
  return <div className="tile span6" aria-busy="true"><div className="skeleton" /><p className="small muted">{title}…</p></div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state" role="alert"><span>{message}</span>{retry && <button className="btn" onClick={retry}>Try again</button>}</div>;
}

export type TrendItem = Record<string, string | number | null>;
export function TrendChart({ data, lines, baseline, height = 230, xKey = 'date', formatValue }: {
  data: TrendItem[];
  lines: Array<{ key: string; label: string; color?: string; dashed?: boolean; markersOnly?: boolean }>;
  baseline?: number;
  height?: number;
  xKey?: string;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#f3e8ed" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#817680' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={formatValue} tick={{ fontSize: 10, fill: '#817680' }} axisLine={false} tickLine={false} width={48} />
          <Tooltip formatter={formatValue ? (value) => formatValue(Number(value)) : undefined} contentStyle={{ borderRadius: 12, borderColor: '#f1e6ec', fontSize: 12 }} />
          {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {baseline !== undefined && <ReferenceLine y={baseline} stroke="#b69eab" strokeDasharray="5 5" label={{ value: 'Baseline', position: 'insideTopRight', fill: '#817680', fontSize: 10 }} />}
          {lines.map((line) => <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.markersOnly ? 'transparent' : line.color ?? '#f65398'} strokeWidth={line.markersOnly ? 0 : 2.4} dot={line.markersOnly ? { r: 4, fill: line.color ?? '#f65398', stroke: '#fff', strokeWidth: 1.5 } : false} connectNulls={false} strokeDasharray={line.dashed ? '5 4' : undefined} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
