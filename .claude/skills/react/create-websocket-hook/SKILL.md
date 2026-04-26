---
name: create-websocket-hook
description: Create a custom WebSocket hook with auto-reconnection, exponential backoff, token-based authentication, tab visibility awareness, and mounted ref guards
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create WebSocket Hook

## Template

Create `src/hooks/use{Feature}Ws.ts`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

const LOG_PREFIX = '[{Feature}WS]';
const UNAUTHORIZED_CLOSE_CODE = 4001;
const BACKOFF_DELAYS = [1000, 2000, 5000, 30000];
const TOKEN_KEY = 'accessToken';

interface Use{Feature}WsReturn {
  data: {DataType} | null;
  isConnected: boolean;
  isError: boolean;
}

export function use{Feature}Ws(
  resourceId: string | null | undefined,
  enabled = true,
): Use{Feature}WsReturn {
  const [data, setData] = useState<{DataType} | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffIndexRef = useRef(0);
  const mountedRef = useRef(true);

  // ── Connect / reconnect ──────────────────────────────────────────

  const connect = useCallback(() => {
    if (!resourceId) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsConnected(false);
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = `${import.meta.env.VITE_WS_URL}/{feature}/${resourceId}?token=${token}`;
    logger.log(LOG_PREFIX, 'Connecting to', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      logger.log(LOG_PREFIX, 'Connected');
      setIsConnected(true);
      setIsError(false);
      backoffIndexRef.current = 0; // Reset backoff on success
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const message = JSON.parse(event.data);
        // Handle message types
        switch (message.type) {
          case 'data_update':
            setData(message.data);
            break;
          default:
            logger.log(LOG_PREFIX, 'Unknown message type:', message.type);
        }
      } catch {
        logger.log(LOG_PREFIX, 'Failed to parse message');
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setIsError(true);
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      setIsConnected(false);

      // Handle unauthorized — redirect to login
      if (event.code === UNAUTHORIZED_CLOSE_CODE) {
        logger.log(LOG_PREFIX, 'Unauthorized, redirecting to login');
        window.location.href = '/login';
        return;
      }

      // Schedule reconnect with exponential backoff
      const delay = BACKOFF_DELAYS[Math.min(backoffIndexRef.current, BACKOFF_DELAYS.length - 1)];
      backoffIndexRef.current += 1;
      logger.log(LOG_PREFIX, `Reconnecting in ${delay}ms (attempt ${backoffIndexRef.current})`);

      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };
  }, [resourceId]);

  // ── Tab visibility reconnection ───────────────────────────────────

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !wsRef.current && resourceId && enabled) {
        backoffIndexRef.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [connect, resourceId, enabled]);

  // ── Main connection lifecycle ─────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    if (resourceId && enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;

      // Clear reconnect timer
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [resourceId, enabled, connect]);

  return { data, isConnected, isError };
}
```

## Critical Patterns

1. **Mounted ref guard**: Check `mountedRef.current` before ALL state updates in callbacks
2. **Exponential backoff**: `BACKOFF_DELAYS = [1000, 2000, 5000, 30000]` — cap at 30s
3. **Token auth**: Read from `localStorage.getItem('accessToken')`, pass as URL param
4. **401 handling**: Close code `4001` → redirect to `/login`
5. **Tab visibility**: Reconnect when tab becomes visible + WebSocket is disconnected
6. **Cleanup**: Close WebSocket + clear timers + set `mountedRef.current = false`
7. **Backoff reset**: Reset `backoffIndexRef` to 0 on successful connection
8. **Logger**: Use `logger` from `@/lib/logger`, never `console.log`

## Checklist

- [ ] Hook at `src/hooks/use{Feature}Ws.ts`
- [ ] `mountedRef` guards on all state updates in callbacks
- [ ] Exponential backoff with capped delays
- [ ] Token-based auth from localStorage
- [ ] 401/4001 close code handling
- [ ] Tab visibility reconnection
- [ ] Proper cleanup (close WS + clear timers + mounted flag)
- [ ] Uses `logger` not `console.log`
