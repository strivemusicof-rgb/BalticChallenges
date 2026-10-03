import { tabHref, useStats, type TabId } from '../shared.ts';
import type { StatsResponse } from '../types.ts';
import { QueryState } from '../ui.tsx';

type StatKey = keyof StatsResponse['stats'];

const ACTION_ITEMS: { key: StatKey; label: string; tab: TabId }[] = [
  { key: 'openReports', label: 'Open reports', tab: 'reports' },
  { key: 'flaggedCompletions', label: 'Flagged completions', tab: 'flagged' },
  { key: 'pendingPosts', label: 'Pending posts', tab: 'posts' },
];

const STATS: { key: StatKey; label: string }[] = [
  { key: 'usersTotal', label: 'Users' },
  { key: 'usersNew7d', label: 'New users (7d)' },
  { key: 'activeUsers1d', label: 'Active (24h)' },
  { key: 'activeUsers7d', label: 'Active (7d)' },
  { key: 'completions1d', label: 'Completions (24h)' },
  { key: 'completions7d', label: 'Completions (7d)' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'posts7d', label: 'Posts (7d)' },
  { key: 'publishedChallenges', label: 'Published challenges' },
  { key: 'publishedPlaces', label: 'Published places' },
];

export function Dashboard() {
  const { data, isLoading, error } = useStats();
  if (!data) return <QueryState isLoading={isLoading} error={error} />;
  const { stats, topChallenges, checkInRejections7d } = data;

  return (
    <>
      <section className="cards">
        {ACTION_ITEMS.map((item) => (
          <a
            key={item.key}
            href={tabHref(item.tab)}
            className={`card stat action${stats[item.key] > 0 ? ' attention' : ''}`}
          >
            <span className="stat-value">{stats[item.key]}</span>
            <span className="stat-label">{item.label} →</span>
          </a>
        ))}
      </section>
      <section className="cards">
        {STATS.map((item) => (
          <div key={item.key} className="card stat">
            <span className="stat-value">{stats[item.key]}</span>
            <span className="stat-label">{item.label}</span>
          </div>
        ))}
      </section>
      <div className="grid-2">
        <section className="card">
          <h2>Top challenges</h2>
          <table>
            <thead>
              <tr>
                <th>Challenge</th>
                <th className="num">Completions</th>
              </tr>
            </thead>
            <tbody>
              {topChallenges.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td className="num">{c.completions}</td>
                </tr>
              ))}
              {topChallenges.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">No completions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h2>Check-in rejections (7d)</h2>
          <table>
            <thead>
              <tr>
                <th>Reason</th>
                <th className="num">Count</th>
              </tr>
            </thead>
            <tbody>
              {checkInRejections7d.map((r) => (
                <tr key={r.reason}>
                  <td>{r.reason}</td>
                  <td className="num">{r.n}</td>
                </tr>
              ))}
              {checkInRejections7d.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">No rejections.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
