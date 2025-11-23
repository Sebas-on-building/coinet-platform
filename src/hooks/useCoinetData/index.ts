import { useEffect, useRef, useState } from "react";
import {
  DataResult,
  UseCoinetDataParams,
  DataState,
  DataSource,
} from "./types";
import { selectAdapter, normalizeData } from "./utils";

// Adapter imports (to be implemented)
// import { fetchWebSocketData } from "./adapters/websocket";
// import { fetchRestData } from "./adapters/rest";
// import { fetchAIData } from "./adapters/ai";
// import { fetchSentimentData } from "./adapters/sentiment";
// import { fetchCacheData } from "./adapters/cache";

export function useCoinetData<T = any>(params: UseCoinetDataParams): DataResult<T> {
  const [state, setState] = useState<DataState>("loading");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [source, setSource] = useState<DataSource>("rest");
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [meta, setMeta] = useState<Record<string, any>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setState("loading");
    setError(undefined);
    setIsLive(false);
    setMeta({});

    // Adapter selection logic
    async function fetchData() {
      try {
        const adapter = selectAdapter(params);
        const result = await adapter<T>(params);
        const normalized = normalizeData(result.data, params.type);
        setData(normalized);
        setSource(result.source);
        setIsLive(result.isLive);
        setState(result.data ? "live" : "empty");
        setLastUpdated(result.lastUpdated);
        setMeta(result.meta || {});
        if (params.onUpdate) params.onUpdate(normalized);
      } catch (err: any) {
        setError(err);
        setState("error");
      }
    }
    fetchData();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return {
    state,
    data,
    error,
    lastUpdated,
    source,
    isLive,
    meta,
  };
} 