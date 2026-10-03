import { useQuery } from '@tanstack/react-query';

import { api } from '../api.ts';
import type { AuditEntry } from '../types.ts';
import { formatDate, QueryState } from '../ui.tsx';

function actorName(actor: AuditEntry['actor']): string {
  if (!actor) return 'system';
  return typeof actor === 'string' ? actor : actor.displayName;
}

function formatDetails(details: unknown): string {
  if (details == null) return '';
  if (typeof details === 'object' && Object.keys(details).length === 0) return '';
  return typeof details === 'string' ? details : JSON.stringify(details);
}

export function Audit() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.get<{ entries: AuditEntry[] }>('/v1/admin/audit'),
  });

  return (
    <>
      <QueryState isLoading={isLoading} error={error} empty={data?.entries.length === 0} />
      {data && data.entries.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e.id}>
                  <td className="small nowrap">{formatDate(e.createdAt)}</td>
                  <td>{actorName(e.actor)}</td>
                  <td><code>{e.action}</code></td>
                  <td className="small">
                    {e.targetType} <code>{e.targetId}</code>
                  </td>
                  <td className="small mono">{formatDetails(e.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
