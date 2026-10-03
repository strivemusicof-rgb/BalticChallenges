import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { api, qs } from '../api.ts';
import { useCurrentUser } from '../auth.tsx';
import type { AdminUser, Role } from '../types.ts';
import { Badge, formatDate, QueryState, SearchBar, useAction, useToast } from '../ui.tsx';

const ROLES: Role[] = ['user', 'moderator', 'admin'];

export function Users() {
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', q],
    queryFn: () => api.get<{ users: AdminUser[] }>(`/v1/admin/users${qs({ q })}`),
  });

  return (
    <>
      <SearchBar onSearch={setQ} placeholder="Search email or name…" />
      <QueryState isLoading={isLoading} error={error} empty={data?.users.length === 0} />
      {data && data.users.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th className="num">Level / XP</th>
                <th className="num">Completions</th>
                <th className="num">Flags</th>
                <th className="num">Reports</th>
                <th>Joined</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => <UserRow key={u.id} user={u} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const me = useCurrentUser();
  const toast = useToast();
  const isAdmin = me.role === 'admin';
  const isSelf = me.id === user.id;
  const invalidate = [['users'], ['reports']];

  const ban = useAction((reason: string) => api.post(`/v1/admin/users/${user.id}/ban`, { reason }), {
    invalidate,
    success: `${user.displayName} banned`,
  });
  const unban = useAction(() => api.post(`/v1/admin/users/${user.id}/unban`), {
    invalidate,
    success: `${user.displayName} unbanned`,
  });
  const setRole = useAction((role: Role) => api.post(`/v1/admin/users/${user.id}/role`, { role }), {
    invalidate,
    success: 'Role updated',
  });

  function onBan() {
    const reason = prompt(`Reason for banning ${user.displayName} (min 3 characters):`)?.trim();
    if (reason === undefined) return;
    if (reason.length < 3) {
      toast('Ban reason must be at least 3 characters');
      return;
    }
    ban.mutate(reason);
  }

  function onRole(role: Role) {
    if (role === user.role) return;
    if (confirm(`Change ${user.displayName}'s role from ${user.role} to ${role}?`)) setRole.mutate(role);
  }

  const busy = ban.isPending || unban.isPending || setRole.isPending;

  return (
    <tr>
      <td>
        <div>{user.displayName}</div>
        <div className="muted small">{user.email}</div>
      </td>
      <td>
        {isAdmin && !isSelf ? (
          <select value={user.role} disabled={busy} onChange={(e) => onRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <Badge tone={user.role === 'user' ? undefined : 'sea'}>{user.role}</Badge>
        )}
      </td>
      <td className="num">{user.level} / {user.xp}</td>
      <td className="num">{user.completions}</td>
      <td className="num">{user.flags > 0 ? <Badge tone="amber">{user.flags}</Badge> : 0}</td>
      <td className="num">{user.reports > 0 ? <Badge tone="danger">{user.reports}</Badge> : 0}</td>
      <td className="small">{formatDate(user.createdAt)}</td>
      <td className="small">
        {user.bannedAt ? (
          <span title={user.banReason ?? undefined}>
            <Badge tone="danger">banned</Badge> {user.banReason}
          </span>
        ) : (
          <Badge tone="success">active</Badge>
        )}
      </td>
      <td className="nowrap">
        {isAdmin && !isSelf && (user.bannedAt ? (
          <button disabled={busy} onClick={() => unban.mutate()}>Unban</button>
        ) : (
          <button className="btn-danger" disabled={busy} onClick={onBan}>Ban</button>
        ))}
      </td>
    </tr>
  );
}
