'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

function getModuleFromPath(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return segment;
}

export function ActivityTracker() {
  const pathname = usePathname();
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
