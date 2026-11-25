import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

export function resolveWsUrl(wsEndpoint = '/api/v1/ws'): string {
  const normalizedPath = wsEndpoint.startsWith('/api/') ? wsEndpoint : `/api/v1${wsEndpoint.startsWith('/') ? wsEndpoint : `/${wsEndpoint}`}`;
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

  let baseWsOrigin: string;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    const url = new URL(apiBase);
    const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
    baseWsOrigin = `${proto}//${url.host}`;
  } else if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    baseWsOrigin = `${proto}//${window.location.host}`;
  } else {
    baseWsOrigin = 'ws://localhost:5001';
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('mediassist_token') : null;
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${baseWsOrigin}${normalizedPath}${qs}`;
}

export interface StompConnectionOptions {
  wsEndpoint?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: () => void;
}

export function createTelehealthStompClient(options: StompConnectionOptions): Client {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mediassist_token') : null;
  const brokerURL = resolveWsUrl(options.wsEndpoint || '/api/v1/ws');

  const client = new Client({
    brokerURL,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      options.onConnect?.();
    },
    onWebSocketClose: () => {
      options.onDisconnect?.();
    },
    onWebSocketError: () => {
      options.onError?.();
    },
    onStompError: () => {
      options.onError?.();
    },
  });

  return client;
}

export type { IMessage, StompSubscription };
