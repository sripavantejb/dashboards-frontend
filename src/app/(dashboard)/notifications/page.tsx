'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { formatDate } from '@/lib/utils';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const notifications = data?.data || [];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Stay updated on all activities"
        action={
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            Mark all as read
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 lg:p-6"><PageLoading rows={4} /></div>
          ) : isError ? (
            <div className="p-5 lg:p-6"><PageError onRetry={() => refetch()} /></div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No notifications</div>
          ) : (
            <div className="card-list">
              {notifications.map((notif) => (
                <button
                  key={notif._id}
                  type="button"
                  onClick={() => !notif.read && markRead.mutate(notif._id)}
                  className={`flex w-full items-start gap-4 p-4 lg:p-5 text-left transition-colors hover:bg-surface-soft ${!notif.read ? 'bg-surface-soft' : ''}`}
                >
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notif.read ? 'bg-accent' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(notif.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
