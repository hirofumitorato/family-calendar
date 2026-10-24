import { useRouter, useLocalSearchParams } from 'expo-router';

import { EventForm } from '@/components/event-form';
import { toDateKey } from '@/lib/date';
import { useApp } from '@/state/app-store';

export default function NewEventScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { repo, ctx, defaultCalendar, bumpRevision } = useApp();

  return (
    <EventForm
      calendars={ctx?.calendars ?? []}
      defaultCalendarId={defaultCalendar?.id}
      defaultDate={date ?? toDateKey(new Date())}
      onSubmit={async (value) => {
        await repo.createEvent(value);
        bumpRevision();
        router.back();
      }}
    />
  );
}
