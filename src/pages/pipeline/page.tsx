import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageSection } from '@/components/layout/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { LEAD_STATUS_LABELS, getInitials } from '@/lib/utils';
import type { LeadCategory, PipelineData } from '@/types';
import { Link } from 'react-router';

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: categoriesData } = useQuery({
    queryKey: ['lead-categories'],
    queryFn: () => api.get<LeadCategory[]>('/lead-categories'),
  });

  const categories = categoriesData?.data || [];
  const activeCategory = selectedCategory || categories[0]?._id || '';

  const { data: pipelineData, isLoading, isError, refetch } = useQuery({
    queryKey: ['pipeline', activeCategory],
    queryFn: () => api.get<PipelineData>(`/leads/pipeline?categoryId=${activeCategory}`),
    enabled: !!activeCategory,
  });

  const updateStatus = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      api.patch(`/leads/${leadId}`, { status }),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['pipeline'] });
        toast.success('Lead moved');
      }
    },
  });

  const pipeline = pipelineData?.data?.pipeline || [];
  const allStages = pipeline.map((s) => s.stage);

  return (
    <>
      <PageHeader title="Sales Pipeline" description="Move leads between pipeline stages" />

      <PageSection>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat._id ? 'bg-primary text-primary-foreground' : 'bg-surface-soft text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </PageSection>

      {isError ? (
        <PageError onRetry={() => refetch()} />
      ) : isLoading ? (
        <PageLoading rows={3} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {pipeline.map((stage) => (
            <div key={stage.stage} className="w-64 sm:w-72 shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium">{LEAD_STATUS_LABELS[stage.stage] || stage.stage}</CardTitle>
                    <Badge variant="outline">{stage.count}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto">
                  {stage.leads.map((lead) => (
                    <div key={lead._id} className="flex flex-col gap-2 rounded-lg border bg-background p-3 lg:p-4">
                      <Link to={`/crm/${lead._id}`} className="block hover:underline">
                        <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                        <p className="text-xs text-muted-foreground">{lead.company}</p>
                      </Link>
                      <div className="flex items-center justify-between gap-2">
                        {lead.assignedTo ? (
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px]">{getInitials(`${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`)}</AvatarFallback>
                          </Avatar>
                        ) : <span />}
                        <select
                          className="h-7 rounded border border-input bg-background px-1 text-[10px] max-w-[120px]"
                          value={lead.status}
                          onChange={(e) => updateStatus.mutate({ leadId: lead._id, status: e.target.value })}
                        >
                          {allStages.map((s) => (
                            <option key={s} value={s}>{LEAD_STATUS_LABELS[s] || s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {stage.leads.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No leads</p>}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
