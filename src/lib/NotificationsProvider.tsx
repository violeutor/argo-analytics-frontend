'use client';

// NotificationsProvider (S85) — vorher lebte der komplette Notification-State
// (Fetch, 30-Min-Poll, 15-Min-Cooldown, visibilitychange-Refresh, seen-IDs aus
// localStorage) ausschließlich in PageContent (main.tsx) und war damit
// unsichtbar für jede andere Route. Jetzt geteilt zwischen TopNav (Bell +
// Dropdown) und main.tsx (Stat-Strip-Zähler "Signals · geladen").
// Getrennt von AuthProvider (eigene fachliche Zuständigkeit), aber
// funktional abhängig davon — Notifications sind account-global, nicht
// company-abhängig, brauchen aber den Auth-Header fürs Fetch.

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';

const BACKEND_PROXY = '/api/backend';

export interface Notification {
  id: string;
  company_name: string;
  event_type: string;
  raw_title: string;
  direction: string; // 'positive' | 'negative' | 'neutral'
  relevance_score: number;
  event_date: string;
  source_url?: string;
  signal_category?: string;
}

const NOTIFICATION_LS_KEY = 'argo_notif_seen_v1';

function getSeenIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFICATION_LS_KEY) || '[]')); }
  catch { return new Set(); }
}

function markSeenLS(ids: string[]): void {
  try {
    const seen = getSeenIds();
    ids.forEach(id => seen.add(id));
    localStorage.setItem(NOTIFICATION_LS_KEY, JSON.stringify(Array.from(seen)));
  } catch {}
}

async function fetchNotificationsApi(): Promise<Notification[]> {
  try {
    const params = new URLSearchParams();
    params.set('days', '7');
    params.set('min_score', '0.5');
    const res = await fetch(`${BACKEND_PROXY}/api/v1/notifications?${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

interface NotificationsContextValue {
  notifications: Notification[];
  seenIds: Set<string>;
  unreadCount: number;
  refreshNotifications: () => void;   // respektiert 15-Min-Cooldown
  forceRefreshNotifications: () => void; // überspringt Cooldown (manueller Refresh-Button)
  markAllRead: () => void;
  markOneRead: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [], seenIds: new Set(), unreadCount: 0,
  refreshNotifications: () => {}, forceRefreshNotifications: () => {},
  markAllRead: () => {}, markOneRead: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const notifLastFetch = useRef<number>(0);
  const NOTIF_COOLDOWN = 15 * 60 * 1000;
  const NOTIF_INTERVAL = 30 * 60 * 1000;

  const refreshNotifications = useCallback(() => {
    const now = Date.now();
    if (now - notifLastFetch.current < NOTIF_COOLDOWN) return;
    notifLastFetch.current = now;
    fetchNotificationsApi().then(setNotifications);
  }, []);

  const forceRefreshNotifications = useCallback(() => {
    notifLastFetch.current = 0;
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    setSeenIds(getSeenIds());
    notifLastFetch.current = 0; // erstes Laden immer
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshNotifications();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshNotifications]);

  useEffect(() => {
    const id = window.setInterval(() => refreshNotifications(), NOTIF_INTERVAL);
    return () => window.clearInterval(id);
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !seenIds.has(n.id)).length;

  const markAllRead = useCallback(() => {
    const ids = notifications.map(n => n.id);
    markSeenLS(ids);
    setSeenIds(getSeenIds());
  }, [notifications]);

  const markOneRead = useCallback((id: string) => {
    markSeenLS([id]);
    setSeenIds(getSeenIds());
  }, []);

  return (
    <NotificationsContext.Provider value={{
      notifications, seenIds, unreadCount,
      refreshNotifications, forceRefreshNotifications, markAllRead, markOneRead,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}
