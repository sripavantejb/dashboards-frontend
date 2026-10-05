import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { portalHref } from '@/lib/portal-href';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types';

/** Persistent popups for BDA (and other) assignees — stay until the X is clicked. */
export function StickyAlerts({ orgSlug }: { orgSlug?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['sticky-notifications'],
    queryFn: () => api.get<Notification[]>('/notifications/sticky'),
    refetchInterval: 12_000,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sticky-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const alerts = (data?.data || []).filter((n) => !n.dismissedAt);
  if (!alerts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex flex-col items-end gap-3 px-4 sm:px-6">
      {alerts.map((n) => {
        const href = portalHref(n.metadata?.href, orgSlug);
        return (
          <div
            key={n._id}
            className="pointer-events-auto w-full max-w-md overflow-hidden rounded-xl border border-hairline bg-white shadow-xl"
            role="alertdialog"
            aria-labelledby={`sticky-title-${n._id}`}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p id={`sticky-title-${n._id}`} className="text-sm font-semibold text-foreground">
                  {n.title}
                </p>
                {n.message && n.message !== n.title && (
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                )}
                {href && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                    onClick={() => navigate(href)}
                  >
                    Open →
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Dismiss"
                onClick={() => dismiss.mutate(n._id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
