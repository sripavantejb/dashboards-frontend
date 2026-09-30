import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useLocation } from 'react-router';

function getModuleFromPath(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return segment;
}

export function ActivityTracker() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuthStore();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || pathname.startsWith('/login') || pathname.startsWith('/register')) return;

    const sendHeartbeat = async () => {
      try {
        const res = await api.post<{ sessionId: string }>('/activity/heartbeat', {
          page: pathname,
          module: getModuleFromPath(pathname),
          sessionId: sessionIdRef.current || undefined,
        });
        if (res.data?.sessionId) {
          sessionIdRef.current = res.data.sessionId;
        }
      } catch {
        // silent fail for tracking
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, pathname]);

  return null;
}
