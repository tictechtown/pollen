import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchFeed } from '@/services/rssClient';
import { useArticlesStore } from '@/store/articles';

const DEFAULT_FEED = 'https://www.theverge.com/rss/index.xml';

export const useArticles = () => {
  const { articles, setArticles, toggleSaved, toggleSeen, lastFetched } = useArticlesStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (feedUrl: string = DEFAULT_FEED) => {
      try {
        setLoading(true);
        setError(null);
        const { articles: fetchedArticles } = await fetchFeed(feedUrl);
        setArticles(fetchedArticles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      } finally {
        setLoading(false);
      }
    },
    [setArticles],
  );

  useEffect(() => {
    if (!lastFetched) {
      load();
    }
  }, [lastFetched, load]);

  const sorted = useMemo(
    () =>
      [...articles].sort((a, b) => {
        const dateA = new Date(a.updatedAt ?? a.publishedAt ?? 0).getTime();
        const dateB = new Date(b.updatedAt ?? b.publishedAt ?? 0).getTime();
        return dateB - dateA;
      }),
    [articles],
  );

  return {
    articles: sorted,
    loading,
    error,
    refresh: () => load(),
    toggleSaved,
    toggleSeen,
  };
};
