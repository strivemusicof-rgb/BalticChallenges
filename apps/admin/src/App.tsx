import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ComponentType } from 'react';

import { useAuth } from './auth.tsx';
import { Login } from './Login.tsx';
import { Audit } from './pages/Audit.tsx';
import { Challenges } from './pages/Challenges.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Flagged } from './pages/Flagged.tsx';
import { Places } from './pages/Places.tsx';
import { Posts } from './pages/Posts.tsx';
import { Reports } from './pages/Reports.tsx';
import { Users } from './pages/Users.tsx';
import { tabHref, useStats, type TabId } from './shared.ts';

const TABS: { id: TabId; label: string; component: ComponentType }[] = [
  { id: 'dashboard', label: 'Dashboard', component: Dashboard },
  { id: 'reports', label: 'Reports', component: Reports },
  { id: 'flagged', label: 'Flagged', component: Flagged },
  { id: 'posts', label: 'Pending posts', component: Posts },
  { id: 'users', label: 'Users', component: Users },
  { id: 'places', label: 'Places', component: Places },
  { id: 'challenges', label: 'Challenges', component: Challenges },
  { id: 'audit', label: 'Audit log', component: Audit },
];

function readHash(): TabId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return TABS.find((t) => t.id === id)?.id ?? 'dashboard';
}

function useHashTab(): TabId {
  const [tab, setTab] = useState(readHash);
  useEffect(() => {
    const onChange = () => setTab(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return tab;
}

function Shell() {
  const { state, logout } = useAuth();
  const queryClient = useQueryClient();
  const tab = useHashTab();
  const { data } = useStats();
  const active = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const Page = active.component;
  const user = state.status === 'authenticated' ? state.user : null;

  const counts: Partial<Record<TabId, number>> = {
    reports: data?.stats.openReports,
    flagged: data?.stats.flaggedCompletions,
    posts: data?.stats.pendingPosts,
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Baltic <span>Challenges</span>
          <small>Admin</small>
        </div>
        <nav>
          {TABS.map((t) => (
            <a key={t.id} href={tabHref(t.id)} className={t.id === tab ? 'active' : undefined}>
              {t.label}
              {counts[t.id] ? <span className="count">{counts[t.id]}</span> : null}
            </a>
          ))}
        </nav>
        {user && (
          <div className="whoami">
            <div>{user.displayName}</div>
            <div className="muted small">
              {user.email} · {user.role}
            </div>
            <button
              className="btn-ghost"
              onClick={() => {
                void logout().then(() => queryClient.clear());
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="content">
        <h1>{active.label}</h1>
        <Page key={active.id} />
      </main>
    </div>
  );
}

export function App() {
  const { state } = useAuth();
  if (state.status === 'loading') return <div className="center muted">Loading…</div>;
  if (state.status === 'anonymous') return <Login notice={state.notice} />;
  return <Shell />;
}
