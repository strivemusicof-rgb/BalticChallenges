import { useQuery } from '@tanstack/react-query';

import { api } from '../api.ts';
import type { FlaggedAttempt } from '../types.ts';
import { Badge, formatDate, QueryState, useAction } from '../ui.tsx';

function osmLink(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
}

export function Flagged() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['flagged'],
    queryFn: () => api.get<{ flagged: FlaggedAttempt[] }>('/v1/admin/flagged'),
  });

  return (
    <>
      <QueryState isLoading={isLoading} error={error} empty={data?.flagged.length === 0} />
      <div className="list">
        {data?.flagged.map((item) => <FlaggedCard key={item.attemptId} item={item} />)}
      </div>
    </>
  );
}

function FlaggedCard({ item }: { item: FlaggedAttempt }) {
  const decide = useAction(
    (decision: 'approve' | 'reject') => api.post(`/v1/admin/flagged/${item.attemptId}/${decision}`),
    { invalidate: [['flagged'], ['users']], success: 'Decision saved' },
  );

  return (
    <article className="card">
      <header className="row-between">
        <div>
          <strong>{item.challenge.title}</strong> <span className="muted">· {item.challenge.xpReward} XP</span>
        </div>
        <span className="muted small">flagged {formatDate(item.flaggedAt)}</span>
      </header>
      <p className="small">
        <strong>{item.user.displayName}</strong> <span className="muted">joined {formatDate(item.user.createdAt)}</span>{' '}
        {item.userFlagCount > 1 && <Badge tone="danger">{item.userFlagCount} flags</Badge>}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Verdict</th>
              <th>Reason</th>
              <th className="num">Distance</th>
              <th className="num">Accuracy</th>
              <th>Mocked</th>
              <th>Device time</th>
              <th>Received</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {item.checkIns.map((c, i) => (
              <tr key={i}>
                <td><Badge tone={c.verdict === 'accepted' ? 'success' : 'amber'}>{c.verdict}</Badge></td>
                <td>{c.reason ?? '—'}</td>
                <td className="num">{c.distanceM != null ? `${Math.round(c.distanceM)} m` : '—'}</td>
                <td className="num">{c.accuracyM != null ? `${Math.round(c.accuracyM)} m` : '—'}</td>
                <td>{c.isMocked ? <Badge tone="danger">yes</Badge> : 'no'}</td>
                <td>{formatDate(c.deviceTime)}</td>
                <td>{formatDate(c.receivedAt)}</td>
                <td>
                  <a href={osmLink(c.lat, c.lng)} target="_blank" rel="noreferrer">
                    {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions">
        <button className="btn-success" disabled={decide.isPending} onClick={() => decide.mutate('approve')}>Approve</button>
        <button className="btn-danger" disabled={decide.isPending} onClick={() => decide.mutate('reject')}>Reject</button>
      </div>
    </article>
  );
}
