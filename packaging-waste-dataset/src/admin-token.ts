import { useSyncExternalStore } from "react";

const storageKey = "admin-token";

let answer: ((token: string | null) => void) | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export function forgetAdminToken() {
  localStorage.removeItem(storageKey);
  notify();
}

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

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useIsAskingForAdminToken = () =>
  useSyncExternalStore(subscribe, () => answer !== null);

export const useHasAdminToken = () =>
  useSyncExternalStore(subscribe, () => Boolean(localStorage.getItem(storageKey)));
