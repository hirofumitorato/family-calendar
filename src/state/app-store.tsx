import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createDemoRepository } from '@/data/demo-repository';
import type { CalendarRepository, FamilyContext } from '@/data/repository';
import { createSupabaseRepository } from '@/data/supabase-repository';
import { addDays, monthGridRange, toDateKey } from '@/lib/date';
import { expandOccurrences } from '@/lib/recurrence';
import { supabase } from '@/lib/supabase';
import type {
  Calendar,
  DaySticker,
  EventOccurrence,
  ViewMode,
  WeatherDaily,
} from '@/lib/types';

type Status = 'loading' | 'signed-out' | 'no-family' | 'ready' | 'error';

type AppState = {
  repo: CalendarRepository;
  status: Status;
  error: string | null;
  ctx: FamilyContext | null;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  /** 表示モードで絞り込んだカレンダー */
  visibleCalendars: Calendar[];
  /** 自分が書き込める既定のカレンダー（モードに応じて家族 or 個人） */
  defaultCalendar: Calendar | null;
  reload: () => Promise<void>;
  /** 予定・スタンプが変わったときに増える。データ再取得のトリガー */
  revision: number;
  bumpRevision: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(
    () => (supabase ? createSupabaseRepository(supabase) : createDemoRepository()),
    [],
  );
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<FamilyContext | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [revision, setRevision] = useState(0);
  const bumpRevision = useCallback(() => setRevision((r) => r + 1), []);

  const reload = useCallback(async () => {
    try {
      const result = await repo.getContext();
      if (typeof result === 'string') {
        setCtx(null);
        setStatus(result);
      } else {
        setCtx(result);
        setStatus('ready');
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [repo]);

  useEffect(() => {
    reload();
    const sub = supabase?.auth.onAuthStateChange(() => reload());
    return () => sub?.data.subscription.unsubscribe();
  }, [reload]);

  useEffect(() => {
    if (status !== 'ready') return;
    return repo.subscribe(bumpRevision);
  }, [repo, status, bumpRevision]);

  const visibleCalendars = useMemo(() => {
    const all = ctx?.calendars ?? [];
    if (viewMode === 'mine') return all.filter((c) => c.visibility === 'personal');
    if (viewMode === 'family') return all.filter((c) => c.visibility === 'family');
    return all;
  }, [ctx, viewMode]);

  const defaultCalendar = useMemo(() => {
    const all = ctx?.calendars ?? [];
    const personal = all.find((c) => c.visibility === 'personal');
    const family = all.find((c) => c.visibility === 'family');
    return (viewMode === 'mine' ? personal ?? family : family ?? personal) ?? null;
  }, [ctx, viewMode]);

  const value: AppState = {
    repo,
    status,
    error,
    ctx,
    viewMode,
    setViewMode,
    visibleCalendars,
    defaultCalendar,
    reload,
    revision,
    bumpRevision,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

export type MonthData = {
  occurrencesByDay: Map<string, EventOccurrence[]>;
  stickersByDay: Map<string, DaySticker[]>;
  weatherByDay: Map<string, WeatherDaily>;
  loading: boolean;
};

/** 月表示（6週分）に必要な予定・スタンプ・天気をまとめて取得 */
export function useMonthData(year: number, month: number): MonthData {
  const { repo, ctx, visibleCalendars, revision } = useApp();
  const [data, setData] = useState<Omit<MonthData, 'loading'>>({
    occurrencesByDay: new Map(),
    stickersByDay: new Map(),
    weatherByDay: new Map(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx) return;
    let cancelled = false;
    const { from, to } = monthGridRange(year, month);
    const fromKey = toDateKey(from);
    const toKey = toDateKey(addDays(to, -1));
    const calendarIds = visibleCalendars.map((c) => c.id);
    const calendarById = new Map(visibleCalendars.map((c) => [c.id, c]));

    setLoading(true);
    Promise.all([
      repo.listEvents(calendarIds, from, to),
      repo.listStickers(calendarIds, fromKey, toKey),
      repo.listWeather(ctx.family.id, fromKey, toKey),
    ])
      .then(([events, stickers, weather]) => {
        if (cancelled) return;

        const occurrencesByDay = new Map<string, EventOccurrence[]>();
        for (const event of events) {
          const calendar = calendarById.get(event.calendar_id);
          if (!calendar) continue;
          const occs = expandOccurrences(
            new Date(event.starts_at),
            new Date(event.ends_at),
            event.rrule,
            from,
            to,
          );
          for (const { start, end } of occs) {
            // 複数日にまたがる予定は各日に表示
            for (let d = new Date(start); d <= end && d < to; d = addDays(d, 1)) {
              if (d < from) continue;
              const k = toDateKey(d);
              const list = occurrencesByDay.get(k) ?? [];
              list.push({ key: `${event.id}@${start.toISOString()}`, event, calendar, start, end });
              occurrencesByDay.set(k, list);
            }
          }
        }
        for (const list of occurrencesByDay.values()) {
          list.sort(
            (a, b) =>
              Number(b.event.all_day) - Number(a.event.all_day) ||
              a.start.getTime() - b.start.getTime(),
          );
        }

        const stickersByDay = new Map<string, DaySticker[]>();
        for (const s of stickers) {
          stickersByDay.set(s.date, [...(stickersByDay.get(s.date) ?? []), s]);
        }

        const weatherByDay = new Map(weather.map((w) => [w.date, w]));
        setData({ occurrencesByDay, stickersByDay, weatherByDay });
      })
      .catch((e) => console.warn('failed to load month data', e))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [repo, ctx, visibleCalendars, year, month, revision]);

  return { ...data, loading };
}
