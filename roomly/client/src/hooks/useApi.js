import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// GET helper with loading/error state, optional polling (interval ms) and skip.
export default function useApi(url, params = {}, { interval, skip } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params);

  const load = useCallback(
    async (silent) => {
      if (skip) return;
      if (!silent) setLoading(true);
      try {
        const r = await api.get(url, { params: JSON.parse(key) });
        setData(r.data);
        setError(null);
      } catch (e) {
        setError(e.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    },
    [url, key, skip]
  );

  useEffect(() => {
    load();
    if (!interval || skip) return undefined;
    const t = setInterval(() => load(true), interval);
    return () => clearInterval(t);
  }, [load, interval, skip]);

  return { data, loading, error, reload: () => load(true) };
}
