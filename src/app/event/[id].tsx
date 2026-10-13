import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { EventForm } from '@/components/event-form';
import { toDateKey } from '@/lib/date';
import type { CalendarEvent } from '@/lib/types';
import { useApp } from '@/state/app-store';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, ctx, bumpRevision } = useApp();
  const [event, setEvent] = useState<CalendarEvent | null | undefined>(undefined);

  useEffect(() => {
    repo.getEvent(id).then(setEvent);
  }, [repo, id]);

  if (event === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (event === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>予定が見つかりませんでした</Text>
      </View>
    );
  }

  return (
    <EventForm
      calendars={ctx?.calendars ?? []}
      initial={event}
      defaultDate={toDateKey(new Date(event.starts_at))}
      onSubmit={async (value) => {
        await repo.updateEvent(event.id, value);
        bumpRevision();
        router.back();
      }}
      onDelete={async () => {
        await repo.deleteEvent(event.id);
        bumpRevision();
        router.back();
      }}
    />
  );
}
