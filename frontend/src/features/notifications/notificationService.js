import { apiRequest, buildApiUrl } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getNotifications(accessToken, query = {}) {
  return apiRequest("notifications", {
    headers: authHeaders(accessToken),
    query,
  });
}

export async function markAllNotificationsRead(accessToken) {
  return apiRequest("notifications/read-all", {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}

export async function markNotificationRead(accessToken, notificationId) {
  return apiRequest(`notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}

function parseSseEvent(rawEvent) {
  const event = {
    type: "message",
    data: "",
  };
  const dataLines = [];

  rawEvent.split(/\r?\n/).forEach((line) => {
    if (line.startsWith("event:")) {
      event.type = line.slice(6).trim();
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  });

  if (dataLines.length > 0) {
    event.data = dataLines.join("\n");
  }

  return event;
}

function handleStreamEvent(rawEvent, handlers) {
  const event = parseSseEvent(rawEvent);

  if (!event.data) {
    return;
  }

  const payload = JSON.parse(event.data);

  if (event.type === "notification.created") {
    handlers.onNotification?.(payload);
    return;
  }

  if (event.type === "connected") {
    handlers.onConnected?.(payload);
  }
}

export async function streamNotifications(accessToken, handlers = {}) {
  const response = await fetch(buildApiUrl("notifications/stream"), {
    method: "GET",
    credentials: "include",
    signal: handlers.signal,
    headers: {
      Accept: "text/event-stream",
      ...authHeaders(accessToken),
    },
  });

  if (!response.ok || !response.body) {
    throw new Error("Realtime notifications unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    events.forEach((rawEvent) => {
      if (rawEvent.trim()) {
        handleStreamEvent(rawEvent, handlers);
      }
    });
  }
}
