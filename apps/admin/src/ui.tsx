import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { errorMessage } from './api.ts';

type ToastKind = 'error' | 'success';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: ToastKind = 'error') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, kind, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 3000);
  }, []);

  return (
    <ToastContext value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            className={`toast toast-${t.kind}`}
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  return use(ToastContext);
}

/** Mutation that toasts errors, optionally toasts success, and invalidates the given query keys. */
export function useAction<TVars = void, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  options: { invalidate?: QueryKey[]; success?: string; onSuccess?: (result: TResult) => void } = {},
) {
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onError: (error) => toast(errorMessage(error)),
    onSuccess: async (result) => {
      if (options.success) toast(options.success, 'success');
      options.onSuccess?.(result);
      await Promise.all(
        [...(options.invalidate ?? []), ['stats']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function QueryState({ isLoading, error, empty }: { isLoading: boolean; error: unknown; empty?: boolean }) {
  if (isLoading) return <p className="muted">Loading…</p>;
  if (error) return <p className="banner banner-error">{errorMessage(error)}</p>;
  if (empty) return <p className="muted">Nothing here.</p>;
  return null;
}

export function SearchBar({ onSearch, placeholder, children }: { onSearch: (q: string) => void; placeholder: string; children?: ReactNode }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(handle);
  }, [value, onSearch]);

  return (
    <div className="toolbar">
      <input type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      {children}
    </div>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: 'danger' | 'success' | 'amber' | 'sea' }) {
  return <span className={`badge${tone ? ` badge-${tone}` : ''}`}>{children}</span>;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}
