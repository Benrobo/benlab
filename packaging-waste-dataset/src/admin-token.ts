import { useSyncExternalStore } from "react";

const storageKey = "admin-token";

let answer: ((token: string | null) => void) | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const forgetAdminToken = () => localStorage.removeItem(storageKey);

export function getAdminToken(): Promise<string | null> {
  const saved = localStorage.getItem(storageKey);
  if (saved) return Promise.resolve(saved);
  return new Promise((resolve) => {
    answer = resolve;
    notify();
  });
}

export function answerAdminToken(token: string | null) {
  if (token) localStorage.setItem(storageKey, token);
  answer?.(token);
  answer = null;
  notify();
}

export function useIsAskingForAdminToken() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => answer !== null
  );
}
