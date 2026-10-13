import type { SupabaseClient } from '@supabase/supabase-js';

import type { CalendarRepository } from '@/data/repository';
import type {
  Calendar,
  CalendarEvent,
  DayColor,
  DaySticker,
  Family,
  FamilyMember,
  WeatherDaily,
} from '@/lib/types';

function check<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function createSupabaseRepository(sb: SupabaseClient): CalendarRepository {
  return {
    mode: 'supabase',

    async getContext() {
      const { data: auth } = await sb.auth.getUser();
      const user = auth.user;
      if (!user) return 'signed-out';

      // MVPでは1ユーザー1家族を前提にする
      const membership = check<{ family_id: string }[]>(
        await sb.from('family_members').select('family_id').eq('user_id', user.id).limit(1),
      );
      if (!membership?.length) return 'no-family';
      const familyId = membership[0].family_id as string;

      const [family, members, calendars] = await Promise.all([
        sb.from('families').select('*').eq('id', familyId).single().then((r) => check<Family>(r)),
        sb.from('family_members').select('*').eq('family_id', familyId).then((r) => check<FamilyMember[]>(r)),
        sb.from('calendars').select('*').eq('family_id', familyId).order('created_at').then((r) => check<Calendar[]>(r)),
      ]);
      return { userId: user.id, family, members, calendars };
    },

    async createFamily(familyName, displayName) {
      check(await sb.rpc('create_family', { family_name: familyName, display_name: displayName }));
    },
    async joinFamily(inviteCode, displayName) {
      check(await sb.rpc('join_family', { code: inviteCode, display_name: displayName }));
    },
    async updateFamilyLocation(familyId, loc) {
      check(
        await sb
          .from('families')
          .update({ latitude: loc.latitude, longitude: loc.longitude, location_name: loc.name })
          .eq('id', familyId),
      );
    },

    async listEvents(calendarIds, from, to) {
      if (!calendarIds.length) return [];
      // 単発予定は範囲で絞り、繰り返し予定は開始が範囲終了より前のものをすべて取得
      return check(
        await sb
          .from('events')
          .select('*')
          .in('calendar_id', calendarIds)
          .lt('starts_at', to.toISOString())
          .or(`ends_at.gte.${from.toISOString()},rrule.not.is.null`),
      ) as CalendarEvent[];
    },
    async getEvent(id) {
      return check(await sb.from('events').select('*').eq('id', id).maybeSingle()) as CalendarEvent | null;
    },
    async createEvent(event) {
      const { data: auth } = await sb.auth.getUser();
      return check(
        await sb
          .from('events')
          .insert({ ...event, created_by: auth.user?.id })
          .select('*')
          .single(),
      ) as CalendarEvent;
    },
    async updateEvent(id, patch) {
      check(await sb.from('events').update(patch).eq('id', id));
    },
    async deleteEvent(id) {
      check(await sb.from('events').delete().eq('id', id));
    },

    async listStickers(calendarIds, fromKey, toKey) {
      if (!calendarIds.length) return [];
      return check(
        await sb
          .from('day_stickers')
          .select('id, calendar_id, date, sticker')
          .in('calendar_id', calendarIds)
          .gte('date', fromKey)
          .lte('date', toKey),
      ) as DaySticker[];
    },
    async addSticker(calendarId, date, sticker) {
      const { data: auth } = await sb.auth.getUser();
      check(
        await sb
          .from('day_stickers')
          .upsert(
            { calendar_id: calendarId, date, sticker, created_by: auth.user?.id },
            { onConflict: 'calendar_id,date,sticker', ignoreDuplicates: true },
          ),
      );
    },
    async removeSticker(id) {
      check(await sb.from('day_stickers').delete().eq('id', id));
    },

    async listDayColors(calendarIds, fromKey, toKey) {
      if (!calendarIds.length) return [];
      return check<DayColor[]>(
        await sb
          .from('day_colors')
          .select('calendar_id, date, color')
          .in('calendar_id', calendarIds)
          .gte('date', fromKey)
          .lte('date', toKey),
      );
    },
    async setDayColor(calendarId, date, color) {
      if (!color) {
        check(await sb.from('day_colors').delete().eq('calendar_id', calendarId).eq('date', date));
        return;
      }
      const { data: auth } = await sb.auth.getUser();
      check(
        await sb
          .from('day_colors')
          .upsert(
            { calendar_id: calendarId, date, color, updated_by: auth.user?.id, updated_at: new Date().toISOString() },
            { onConflict: 'calendar_id,date' },
          ),
      );
    },

    async listWeather(familyId, fromKey, toKey) {
      return check(
        await sb
          .from('weather_daily')
          .select('date, weather_code, temp_max, temp_min, precip_prob')
          .eq('family_id', familyId)
          .gte('date', fromKey)
          .lte('date', toKey),
      ) as WeatherDaily[];
    },

    subscribe(onChange) {
      // RLS が効くので、自分が見られる行の変更だけが届く
      const channel = sb
        .channel('calendar-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'day_stickers' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'day_colors' }, onChange)
        .subscribe();
      return () => {
        sb.removeChannel(channel);
      };
    },

    async signOut() {
      await sb.auth.signOut();
    },
  };
}
