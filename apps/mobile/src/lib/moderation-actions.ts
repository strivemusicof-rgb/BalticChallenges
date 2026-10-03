

import type { ReportReason } from '@/lib/types';
import { showAlert } from '@/lib/dialog';

const REASONS: { reason: ReportReason; label: string }[] = [
  { reason: 'spam', label: 'Spam' },
  { reason: 'abuse', label: 'Harassment or hate' },
  { reason: 'nudity', label: 'Nudity or sexual content' },
  { reason: 'violence', label: 'Violence or danger' },
  { reason: 'fake_completion', label: 'Fake completion' },
  { reason: 'unsafe', label: 'Encourages unsafe behaviour' },
  { reason: 'other', label: 'Something else' },
];

/** Asks for a report reason; resolves null if cancelled. */
export function askReportReason(subject: string): Promise<ReportReason | null> {
  return new Promise((resolve) => {
    showAlert(`Report ${subject}`, 'Why are you reporting this? Our team reviews every report.', [
      ...REASONS.map(({ reason, label }) => ({ text: label, onPress: () => resolve(reason) })),
      { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
    ]);
  });
}

export function confirmBlock(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    showAlert(
      `Block ${name}?`,
      "They won't be able to see your profile or posts, and you won't see theirs. They are not notified.",
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Block', style: 'destructive', onPress: () => resolve(true) },
      ],
    );
  });
}

export function reportReceived() {
  showAlert('Thanks for reporting', 'We will review it shortly. You can also block this person.');
}
