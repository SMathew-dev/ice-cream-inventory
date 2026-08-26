'use client';

export function ConnectionBadge({ mode }: { mode: 'demo'|'live'|'error' }) {
  const label = mode === 'live' ? 'LIVE DATABASE' : mode === 'error' ? 'CONNECTION ERROR' : 'DEMO MODE';
  return <span className={`connection-badge connection-${mode}`}>{label}</span>;
}
