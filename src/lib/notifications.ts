export type AppNotificationType = "activity" | "messages" | "nearby" | "smart-match";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: AppNotificationType;
  createdAt: string;
  read: boolean;
}

const KEY = "sharex:notifications";

export function readNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

export function writeNotification(
  notification: Omit<AppNotification, "id" | "createdAt" | "read">,
) {
  if (typeof window === "undefined") return;
  const existing = readNotifications();
  const next: AppNotification = {
    ...notification,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  const items = [next, ...existing].slice(0, 20);
  window.localStorage.setItem(KEY, JSON.stringify(items));
  return next;
}

export function markNotificationsRead() {
  if (typeof window === "undefined") return;
  try {
    const current = readNotifications();
    const next = current.map((item) => ({ ...item, read: true }));
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}
