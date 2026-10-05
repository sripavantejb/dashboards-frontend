import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { formatDate } from '@/lib/utils';
import { portalHref } from '@/lib/portal-href';
import { useAuthStore } from '@/stores/auth';
import type { Notification } from '@/types';

/** Shared inbox for ERP and BDA — opens the deep link when present. */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const organization = useAuthStore((s) => s.organization);
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

  const openNotif = (notif: Notification) => {
    if (!notif.read) markRead.mutate(notif._id);
    const href = portalHref(notif.metadata?.href, orgSlug || organization?.slug);
    if (href) navigate(href);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Assignments, nudges, and escalations from your team"
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
            <div className="p-12 text-center text-muted-foreground">No notifications yet. When a manager assigns a lead or nudges you, it appears here.</div>
          ) : (
            <div className="card-list">
              {notifications.map((notif) => (
                <button
                  key={notif._id}
                  type="button"
                  onClick={() => openNotif(notif)}
                  className={`flex w-full items-start gap-4 p-4 lg:p-5 text-left transition-colors hover:bg-surface-soft ${!notif.read ? 'bg-surface-soft' : ''}`}
                >
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!notif.read ? 'bg-accent' : 'bg-transparent'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{notif.message}</p>
                    {notif.metadata?.href && <p className="mt-1 text-xs text-primary">Open →</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(notif.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
