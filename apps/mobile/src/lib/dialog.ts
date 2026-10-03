import { useSyncExternalStore } from 'react';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
}

let current: DialogRequest | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Drop-in replacement for `Alert.alert` that renders our own bottom sheet.
 * Works the same on iOS, Android and the web (where `Alert` is a no-op).
 */
export function showAlert(title: string, message?: string, buttons?: DialogButton[]) {
  current = { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  emit();
}

export function dismissAlert(button?: DialogButton) {
  current = null;
  emit();
  button?.onPress?.();
}

export function useDialog() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
