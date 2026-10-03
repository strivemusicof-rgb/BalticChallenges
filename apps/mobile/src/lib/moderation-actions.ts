import { showAlert } from '@/lib/dialog';
import { i18n } from '@/lib/i18n';
import type { ReportReason } from '@/lib/types';

const REASONS: ReportReason[] = ['spam', 'abuse', 'nudity', 'violence', 'fake_completion', 'unsafe', 'other'];

type Subject = 'post' | 'comment' | 'profile' | 'challenge';

/** Asks for a report reason; resolves null if cancelled. */
export function askReportReason(subject: Subject): Promise<ReportReason | null> {
  return new Promise((resolve) => {
    showAlert(i18n.t('moderation.reportTitle', { subject: i18n.t(`moderation.subjects.${subject}`) }), i18n.t('moderation.reportBody'), [
      ...REASONS.map((reason) => ({ text: i18n.t(`moderation.reasons.${reason}`), onPress: () => resolve(reason) })),
      { text: i18n.t('common.cancel'), style: 'cancel' as const, onPress: () => resolve(null) },
    ]);
  });
}

export function confirmBlock(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    showAlert(i18n.t('moderation.blockTitle', { name }), i18n.t('moderation.blockBody'), [
      { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: i18n.t('moderation.block'), style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function reportReceived() {
  showAlert(i18n.t('moderation.thanks'), i18n.t('moderation.thanksBody'));
}
