import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { Reveal } from '@/components/reveal';
import { EmptyState, ErrorState, LoadingState, Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { Tag } from '@/components/ui/tag';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, API_URL } from '@/lib/api';
import { showAlert } from '@/lib/dialog';
import { formatDistance, formatNumber, timeAgo } from '@/lib/format';
import type { GlyphName } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';
import { useCurrentUser } from '@/providers/auth-provider';

type Tab = 'overview' | 'moderation' | 'users' | 'content';

interface Stats {
  usersTotal: number;
  usersNew7d: number;
  activeUsers1d: number;
  activeUsers7d: number;
  completions1d: number;
  completions7d: number;
  posts7d: number;
  openReports: number;
  flaggedCompletions: number;
  pendingPosts: number;
  publishedChallenges: number;
  publishedPlaces: number;
}

interface Report {
  id: string;
  targetType: string;
  reason: string;
  createdAt: string;
  reporter: { id: string; displayName: string } | null;
  reportCount: number;
  target: { author?: string; body?: string } | null;
}

interface Flagged {
  attemptId: string;
  flaggedAt: string;
  user: { id: string; displayName: string };
  challenge: { id: string; title: string; xpReward: number };
  checkIns: { reason: string | null; distanceM: number; accuracyM: number; isMocked: boolean }[] | null;
}

interface PendingPost {
  id: string;
  body: string;
  createdAt: string;
  author: string;
}

interface AdminUser {
  id: string;
  email: string | null;
  displayName: string;
  role: string;
  level: number;
  bannedAt: string | null;
  completions: number;
  flags: number;
  reports: number;
}

interface AdminChallenge {
  id: string;
  title: string;
  placeName: string | null;
  xpReward: number;
  status: string;
  completions: number;
}

function Stat({ glyph, value, label }: { glyph: GlyphName; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Glyph name={glyph} size={20} color={Brand.sea} />
      <ThemedText style={styles.statValue}>{formatNumber(value)}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function Overview() {
  const t = useT();
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api<{ stats: Stats }>('/v1/admin/stats') });
  if (stats.isPending) return <LoadingState />;
  if (stats.isError) return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />;
  const s = stats.data.stats;
  return (
    <Reveal style={styles.section}>
      <View style={styles.statGrid}>
        <Stat glyph="account-group-outline" value={s.usersTotal} label={t('admin.users')} />
        <Stat glyph="pulse" value={s.activeUsers1d} label={t('admin.activeToday')} />
        <Stat glyph="flag-checkered" value={s.completions7d} label={`${t('admin.completions')} · 7d`} />
        <Stat glyph="image-multiple-outline" value={s.posts7d} label={`${t('admin.posts')} · 7d`} />
        <Stat glyph="map-marker-multiple-outline" value={s.publishedChallenges} label={t('admin.challenges')} />
        <Stat glyph="alert-octagon-outline" value={s.openReports + s.flaggedCompletions + s.pendingPosts} label={t('admin.queues')} />
      </View>
      <Button
        variant="outline"
        icon="open-outline"
        label={t('admin.webDashboard')}
        onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/admin/`)}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {t('admin.webDashboardHint')}
      </ThemedText>
    </Reveal>
  );
}

function Moderation() {
  const t = useT();
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => api<{ reports: Report[] }>('/v1/admin/reports') });
  const flagged = useQuery({ queryKey: ['admin', 'flagged'], queryFn: () => api<{ flagged: Flagged[] }>('/v1/admin/flagged') });
  const pending = useQuery({ queryKey: ['admin', 'pending'], queryFn: () => api<{ posts: PendingPost[] }>('/v1/admin/posts/pending') });
  const act = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => api(path, { method: 'POST', body: body ?? {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
    onError: (error) => showAlert(t('common.somethingWrong'), error.message),
  });

  if (reports.isPending || flagged.isPending || pending.isPending) return <LoadingState />;
  const reportList = reports.data?.reports ?? [];
  const flaggedList = flagged.data?.flagged ?? [];
  const pendingList = pending.data?.posts ?? [];
  if (reportList.length + flaggedList.length + pendingList.length === 0) {
    return <EmptyState icon="check-decagram-outline" title={t('admin.nothingToReview')} />;
  }

  return (
    <View style={styles.section}>
      {reportList.length > 0 && <SectionHeader title={`${t('admin.openReports')} (${reportList.length})`} />}
      {reportList.map((report) => (
        <View key={report.id} style={styles.item}>
          <View style={styles.itemHeader}>
            <Tag label={t(`moderation.subjects.${report.targetType === 'user' ? 'profile' : report.targetType}`, { defaultValue: report.targetType })} tone="red" />
            <ThemedText style={styles.meta}>{timeAgo(report.createdAt)}</ThemedText>
          </View>
          {report.target?.author && <ThemedText type="smallBold">{report.target.author}</ThemedText>}
          {report.target?.body ? (
            <ThemedText type="small" numberOfLines={4}>
              {report.target.body}
            </ThemedText>
          ) : null}
          <ThemedText style={styles.meta}>
            {t('admin.reason', { reason: t(`moderation.reasons.${report.reason}`, { defaultValue: report.reason }) })}
            {report.reporter ? ` · ${t('admin.reportedBy', { name: report.reporter.displayName })}` : ''}
          </ThemedText>
          <View style={styles.actions}>
            <Button size="small" variant="secondary" label={t('admin.dismiss')} onPress={() => act.mutate({ path: `/v1/admin/reports/${report.id}/resolve`, body: { action: 'dismiss' } })} />
            {report.targetType !== 'user' && report.targetType !== 'challenge' && (
              <Button size="small" variant="danger" label={t('admin.remove')} onPress={() => act.mutate({ path: `/v1/admin/reports/${report.id}/resolve`, body: { action: 'hide_content' } })} />
            )}
            {report.targetType !== 'challenge' && (
              <Button size="small" variant="danger" label={t('admin.ban')} onPress={() => act.mutate({ path: `/v1/admin/reports/${report.id}/resolve`, body: { action: 'ban_user' } })} />
            )}
          </View>
        </View>
      ))}

      {flaggedList.length > 0 && <SectionHeader title={`${t('admin.flagged')} (${flaggedList.length})`} />}
      {flaggedList.map((item) => {
        const last = item.checkIns?.[0];
        return (
          <View key={item.attemptId} style={styles.item}>
            <View style={styles.itemHeader}>
              <ThemedText type="smallBold" style={styles.flex}>
                {item.challenge.title}
              </ThemedText>
              <ThemedText style={styles.meta}>{timeAgo(item.flaggedAt)}</ThemedText>
            </View>
            <ThemedText type="small">{item.user.displayName}</ThemedText>
            {last && (
              <ThemedText style={styles.meta}>
                {t('admin.distance', { distance: formatDistance(last.distanceM) })} · ±{Math.round(last.accuracyM)} m
                {last.reason ? ` · ${last.reason}` : ''}
              </ThemedText>
            )}
            <View style={styles.actions}>
              <Button size="small" label={t('admin.approve')} onPress={() => act.mutate({ path: `/v1/admin/flagged/${item.attemptId}/approve` })} />
              <Button size="small" variant="danger" label={t('admin.reject')} onPress={() => act.mutate({ path: `/v1/admin/flagged/${item.attemptId}/reject` })} />
            </View>
          </View>
        );
      })}

      {pendingList.length > 0 && <SectionHeader title={`${t('admin.pendingPosts')} (${pendingList.length})`} />}
      {pendingList.map((post) => (
        <View key={post.id} style={styles.item}>
          <View style={styles.itemHeader}>
            <ThemedText type="smallBold" style={styles.flex}>
              {post.author}
            </ThemedText>
            <ThemedText style={styles.meta}>{timeAgo(post.createdAt)}</ThemedText>
          </View>
          <ThemedText type="small" numberOfLines={5}>
            {post.body}
          </ThemedText>
          <View style={styles.actions}>
            <Button size="small" label={t('admin.publish')} onPress={() => act.mutate({ path: `/v1/admin/posts/${post.id}/moderation`, body: { state: 'visible' } })} />
            <Button size="small" variant="danger" label={t('admin.hide')} onPress={() => act.mutate({ path: `/v1/admin/posts/${post.id}/moderation`, body: { state: 'hidden' } })} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Users() {
  const t = useT();
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const users = useQuery({
    queryKey: ['admin', 'users', q.trim()],
    queryFn: () => api<{ users: AdminUser[] }>('/v1/admin/users', { query: { q: q.trim() || undefined } }),
  });
  const act = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => api(path, { method: 'POST', body: body ?? {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
    onError: (error) => showAlert(t('common.somethingWrong'), error.message),
  });

  return (
    <View style={styles.section}>
      <View style={styles.search}>
        <Icon name="search" size={18} color="#7C8A83" />
        <TextInput value={q} onChangeText={setQ} placeholder={t('admin.searchUsers')} placeholderTextColor="#8A9790" autoCapitalize="none" style={styles.input} />
      </View>
      {users.isPending ? (
        <LoadingState />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : (
        users.data.users.map((user) => (
          <View key={user.id} style={styles.item}>
            <View style={styles.itemHeader}>
              <ThemedText type="smallBold" style={styles.flex}>
                {user.displayName}
              </ThemedText>
              {user.bannedAt && <Tag label={t('admin.banned')} tone="red" />}
              {user.role !== 'user' && <Tag label={user.role} tone="green" />}
            </View>
            <ThemedText style={styles.meta}>
              {user.email ?? '—'} · {t('common.level', { level: user.level })} · {user.completions} {t('admin.completions').toLowerCase()}
              {user.flags > 0 ? ` · ${user.flags} flags` : ''}
            </ThemedText>
            {user.id !== me.id && user.role === 'user' && (
              <View style={styles.actions}>
                {user.bannedAt ? (
                  <Button size="small" variant="secondary" label={t('admin.unban')} onPress={() => act.mutate({ path: `/v1/admin/users/${user.id}/unban` })} />
                ) : (
                  <Button
                    size="small"
                    variant="danger"
                    label={t('admin.ban')}
                    onPress={() => act.mutate({ path: `/v1/admin/users/${user.id}/ban`, body: { reason: t('admin.banReason') } })}
                  />
                )}
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

function Content() {
  const t = useT();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const challenges = useQuery({
    queryKey: ['admin', 'challenges', q.trim()],
    queryFn: () => api<{ challenges: AdminChallenge[] }>('/v1/admin/challenges', { query: { q: q.trim() || undefined } }),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/v1/admin/challenges/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
    onError: (error) => showAlert(t('common.somethingWrong'), error.message),
  });

  return (
    <View style={styles.section}>
      <View style={styles.search}>
        <Icon name="search" size={18} color="#7C8A83" />
        <TextInput value={q} onChangeText={setQ} placeholder={t('browse.search')} placeholderTextColor="#8A9790" style={styles.input} />
      </View>
      {challenges.isPending ? (
        <LoadingState />
      ) : challenges.isError ? (
        <ErrorState error={challenges.error} onRetry={() => challenges.refetch()} />
      ) : (
        challenges.data.challenges.map((challenge) => (
          <View key={challenge.id} style={[styles.item, styles.contentRow]}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{challenge.title}</ThemedText>
              <ThemedText style={styles.meta}>
                {[challenge.placeName, t('common.xp', { xp: challenge.xpReward }), `${challenge.completions} ${t('admin.completions').toLowerCase()}`]
                  .filter(Boolean)
                  .join(' · ')}
              </ThemedText>
            </View>
            <Switch
              value={challenge.status === 'published'}
              trackColor={{ true: Brand.sea }}
              accessibilityLabel={t('admin.publishedToggle')}
              onValueChange={(on) => update.mutate({ id: challenge.id, status: on ? 'published' : 'draft' })}
            />
          </View>
        ))
      )}
    </View>
  );
}

export default function AdminScreen() {
  const t = useT();
  const user = useCurrentUser();
  const [tab, setTab] = useState<Tab>('overview');

  // The API enforces roles too; this only keeps the screen out of reach for regular accounts.
  if (user.role !== 'admin' && user.role !== 'moderator') {
    return <EmptyState icon="shield-lock-outline" title={t('common.somethingWrong')} />;
  }

  const tabs = [
    { id: 'overview', label: t('admin.overview') },
    { id: 'moderation', label: t('admin.queues') },
    { id: 'users', label: t('admin.users') },
    { id: 'content', label: t('admin.content') },
  ] as const;

  return (
    <Screen edges={['bottom']}>
      <View style={styles.banner}>
        <Icon name="shield-checkmark" size={18} color={Brand.sea} />
        <ThemedText type="small" style={styles.bannerText}>
          {t('admin.role', { role: user.role })} · {user.email}
        </ThemedText>
      </View>
      <Segmented options={tabs} value={tab} onChange={setTab} />
      {tab === 'overview' && <Overview />}
      {tab === 'moderation' && <Moderation />}
      {tab === 'users' && <Users />}
      {tab === 'content' && <Content />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  flex: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + 2,
    borderRadius: Radius.medium,
    backgroundColor: Brand.mint,
  },
  bannerText: {
    color: Brand.sea,
    fontWeight: 700,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stat: {
    width: '31.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 800,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7A72',
    fontWeight: 600,
    textAlign: 'center',
  },
  item: {
    gap: 6,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  meta: {
    fontSize: 12,
    color: '#7C8A83',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: 4,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#F2F5F3',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#15211B',
    paddingVertical: Spacing.two,
  },
});
