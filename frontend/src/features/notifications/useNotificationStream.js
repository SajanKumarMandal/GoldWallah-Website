import { useEffect, useRef } from "react";

import { streamNotifications } from "@/features/notifications/notificationService";

export function useNotificationStream({
  accessToken,
  enabled = true,
  onConnected,
  onNotification,
  onError,
}) {
  const handlersRef = useRef({
    onConnected,
    onNotification,
    onError,
  });

  useEffect(() => {
    handlersRef.current = {
      onConnected,
      onNotification,
      onError,
    };
  }, [onConnected, onNotification, onError]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return undefined;
    }

    let isClosed = false;
    let retryTimerId;
    let retryDelayMs = 1000;
    let streamController;

    async function connect() {
      streamController = new AbortController();

      try {
        await streamNotifications(accessToken, {
          signal: streamController.signal,
          onConnected: (payload) => handlersRef.current.onConnected?.(payload),
          onNotification: (payload) =>
            handlersRef.current.onNotification?.(payload),
        });
        retryDelayMs = 1000;
      } catch (error) {
        if (isClosed || streamController.signal.aborted) {
          return;
        }

        handlersRef.current.onError?.(error);
      }

      if (!isClosed) {
        retryTimerId = window.setTimeout(connect, retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs * 2, 30000);
      }
    }

    connect();

    return () => {
      isClosed = true;
      streamController?.abort();
      window.clearTimeout(retryTimerId);
    };
  }, [accessToken, enabled]);
}
