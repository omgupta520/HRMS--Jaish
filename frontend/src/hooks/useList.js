/**
 * Generic list-fetching hook with pagination + filter state for table pages.
 */
import { useState, useEffect, useCallback } from 'react';
import { errMsg } from '../api/client';
import toast from 'react-hot-toast';

export function useList(fetcher, initialParams = {}) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ page: 1, limit: 10, ...initialParams });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher(params);
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = (key, value) => setParams((p) => ({ ...p, [key]: value, page: key === 'page' ? value : 1 }));

  return { data, meta, loading, params, setParam, reload: load };
}
