import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { api, qs } from '../api.ts';
import { useIsAdmin } from '../auth.tsx';
import type { Report, ReportAction, ReportStatus } from '../types.ts';
import { Badge, formatDate, QueryState, useAction } from '../ui.tsx';

const STATUSES: ReportStatus[] = ['open', 'actioned', 'dismissed'];
const HIDEABLE = new Set<Report['targetType']>(['post', 'comment', 'photo']);

export function Reports() {
  const [status, setStatus] = useState<ReportStatus>('open');
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', status],
    queryFn: () => api.get<{ reports: Report[] }>(`/v1/admin/reports${qs({ status })}`),
  });

  return (
    <>
      <div className="toolbar">
        <div className="segmented">
          {STATUSES.map((s) => (
            <button key={s} className={s === status ? 'active' : undefined} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <QueryState isLoading={isLoading} error={error} empty={data?.reports.length === 0} />
      <div className="list">
        {data?.reports.map((report) => <ReportCard key={report.id} report={report} />)}
      </div>
    </>
  );
}

function ReportCard({ report }: { report: Report }) {
  const isAdmin = useIsAdmin();
  const [note, setNote] = useState('');
  const resolve = useAction(
    (action: ReportAction) => api.post(`/v1/admin/reports/${report.id}/resolve`, { action, ...(note.trim() ? { note: note.trim() } : {}) }),
    { invalidate: [['reports'], ['users'], ['posts']], success: 'Report resolved' },
  );
  const target = report.target;
  const canHide = HIDEABLE.has(report.targetType);

  function run(action: ReportAction) {
    if (action === 'ban_user' && !confirm(`Ban ${target?.author ?? 'this user'}? Their visible posts will be hidden.`)) return;
    resolve.mutate(action);
  }

  return (
    <article className="card">
      <header className="row-between">
        <div>
          <Badge tone="sea">{report.targetType}</Badge> <strong>{report.reason}</strong>
          {report.reportCount > 1 && <Badge tone="danger">{report.reportCount} reports</Badge>}
        </div>
        <span className="muted small">{formatDate(report.createdAt)}</span>
      </header>
      {report.details && <p className="quote">{report.details}</p>}
      <p className="muted small">
        Reported by {report.reporter.displayName ?? 'deleted user'} · target <code>{report.targetId}</code>
      </p>
      {target ? (
        <div className="target">
          <div className="small">
            {target.author && <>Author: <strong>{target.author}</strong> </>}
            {target.moderation && <Badge tone={target.moderation === 'visible' ? 'success' : 'amber'}>{target.moderation}</Badge>}
            {target.bannedAt && <Badge tone="danger">banned {formatDate(target.bannedAt)}</Badge>}
          </div>
          {target.body && <p className="body-text">{target.body}</p>}
          {target.photos && target.photos.length > 0 && (
            <div className="thumbs">
              {target.photos.map((key) => (
                <a key={key} href={`/uploads/${key}`} target="_blank" rel="noreferrer">
                  <img src={`/uploads/${key}`} alt="Reported content" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="muted small">Target no longer exists.</p>
      )}
      {report.status === 'open' ? (
        <div className="actions">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resolution note (optional)" maxLength={500} />
          <button disabled={resolve.isPending} onClick={() => run('dismiss')}>Dismiss</button>
          {canHide && (
            <>
              <button className="btn-amber" disabled={resolve.isPending} onClick={() => run('hide_content')}>Hide content</button>
              <button disabled={resolve.isPending} onClick={() => run('restore_content')}>Restore content</button>
            </>
          )}
          {isAdmin && target?.authorId && (
            <button className="btn-danger" disabled={resolve.isPending} onClick={() => run('ban_user')}>Ban user</button>
          )}
        </div>
      ) : (
        <p className="small">
          <Badge>{report.status}</Badge> {report.resolutionNote}
        </p>
      )}
    </article>
  );
}
