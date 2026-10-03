import { useReference } from './shared.ts';
import type { ContentStatus } from './types.ts';
import { Badge } from './ui.tsx';

export function StatusBadge({ status }: { status: ContentStatus }) {
  const tone = status === 'published' ? 'success' : status === 'draft' ? 'amber' : undefined;
  return <Badge tone={tone}>{status}</Badge>;
}

export function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: ref } = useReference();
  const categories = ref?.categories ?? [];
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const label = (c: (typeof categories)[number]) => (c.parentId ? `${names.get(c.parentId) ?? c.parentId} › ${c.name}` : c.name);
  const sorted = [...categories].sort((a, b) => label(a).localeCompare(label(b)));

  return (
    <select value={value} required onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      {value && !names.has(value) && <option value={value}>{value}</option>}
      {sorted.map((c) => (
        <option key={c.id} value={c.id}>{`${c.icon ? `${c.icon} ` : ''}${label(c)}`}</option>
      ))}
    </select>
  );
}
