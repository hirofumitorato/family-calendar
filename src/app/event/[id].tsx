import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { DeleteEventSheet } from '@/components/delete-event-sheet';
import { EventForm } from '@/components/event-form';
import { deleteEventWithScope } from '@/data/delete-event';
import { useTemplates } from '@/hooks/use-templates';
import { toDateKey } from '@/lib/date';
import type { CalendarEvent } from '@/lib/types';
import { useApp } from '@/state/app-store';

export default function EditEventScreen() {
  const router = useRouter();
  // occurrence: 日の詳細からタップした回の開始時刻（繰り返し予定の「この予定のみ削除」に使う）
  const { id, occurrence } = useLocalSearchParams<{ id: string; occurrence?: string }>();
  const { repo, ctx, bumpRevision } = useApp();
  const [event, setEvent] = useState<CalendarEvent | null | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const { save: saveTemplate } = useTemplates();

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

  const occurrenceStart = occurrence ? new Date(occurrence) : new Date(event.starts_at);

  return (
    <>
      <EventForm
        calendars={ctx?.calendars ?? []}
        people={ctx?.people ?? []}
        initial={event}
        onSaveTemplate={saveTemplate}
        defaultDate={toDateKey(new Date(event.starts_at))}
        onSubmit={async (value) => {
          await repo.updateEvent(event.id, value);
          bumpRevision();
          router.back();
        }}
        onDelete={() => setDeleting(true)}
      />
      <DeleteEventSheet
        target={deleting ? { event, occurrenceStart } : null}
        onClose={() => setDeleting(false)}
        onSelect={async (scope) => {
          setDeleting(false);
          await deleteEventWithScope(repo, event, occurrenceStart, scope);
          bumpRevision();
          router.back();
        }}
      />
    </>
  );
}
