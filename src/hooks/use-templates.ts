import { useCallback, useEffect, useState } from 'react';

import type { EventTemplate, NewEventTemplate } from '@/lib/types';
import { useApp } from '@/state/app-store';

/** 家族の予定テンプレートの一覧と、追加・更新・削除 */
export function useTemplates() {
  const { repo, ctx, revision, bumpRevision } = useApp();
  const familyId = ctx?.family.id;
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  // revision が変わったら読み直す（別の画面でテンプレートを編集したときも反映される）
  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;
    repo
      .listTemplates(familyId)
      .then((list) => {
        if (cancelled) return;
        setTemplates(list);
        setLoaded(true);
      })
      .catch((e) => console.warn('failed to load templates', e));
    return () => {
      cancelled = true;
    };
  }, [repo, familyId, revision]);

  const save = useCallback(
    async (tpl: Omit<NewEventTemplate, 'family_id'>) => {
      if (!familyId) return;
      await repo.createTemplate({ ...tpl, family_id: familyId });
      bumpRevision();
    },
    [repo, familyId, bumpRevision],
  );

  const update = useCallback(
    async (id: string, patch: Partial<NewEventTemplate>) => {
      await repo.updateTemplate(id, patch);
      bumpRevision();
    },
    [repo, bumpRevision],
  );

  const remove = useCallback(
    async (tpl: EventTemplate) => {
      await repo.deleteTemplate(tpl.id);
      bumpRevision();
    },
    [repo, bumpRevision],
  );

  return { templates, loaded, save, update, remove };
}
