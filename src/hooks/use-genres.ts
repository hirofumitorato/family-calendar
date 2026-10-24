import { useCallback, useEffect, useState } from 'react';

import type { Genre } from '@/lib/types';
import { useApp } from '@/state/app-store';

/** テンプレートのジャンルの一覧と、追加・名前変更・削除 */
export function useGenres() {
  const { repo, ctx, revision, bumpRevision } = useApp();
  const familyId = ctx?.family.id;
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;
    repo
      .listGenres(familyId)
      .then((list) => !cancelled && setGenres(list))
      .catch((e) => console.warn('failed to load genres', e));
    return () => {
      cancelled = true;
    };
  }, [repo, familyId, revision]);

  const create = useCallback(
    async (name: string) => {
      if (!familyId) return;
      await repo.createGenre(familyId, name);
      bumpRevision();
    },
    [repo, familyId, bumpRevision],
  );
  const rename = useCallback(
    async (g: Genre, name: string) => {
      await repo.renameGenre(g, name);
      bumpRevision();
    },
    [repo, bumpRevision],
  );
  const remove = useCallback(
    async (g: Genre) => {
      await repo.deleteGenre(g);
      bumpRevision();
    },
    [repo, bumpRevision],
  );

  return { genres, create, rename, remove };
}
