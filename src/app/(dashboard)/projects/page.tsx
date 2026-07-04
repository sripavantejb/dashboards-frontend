'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading, EmptyState } from '@/components/shared/page-states';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Project } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700', active: 'bg-green-100 text-green-700', on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700',
};

export default function ProjectsPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', budget: 0, status: 'planning' });
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects?limit=50'),
  });

  const createProject = useMutation({
    mutationFn: () => api.post('/projects', form),
    onSuccess: () => { toast.success('Project created'); queryClient.invalidateQueries({ queryKey: ['projects'] }); setShowNew(false); },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) => api.patch(`/projects/${id}`, updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project updated'); },
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); },
  });

  const projects = data?.data || [];

  return (
    <>
      <PageHeader title="Projects" description="Track project progress, budgets, and milestones"
        action={<Button className="w-full sm:w-auto" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" /> New Project</Button>}
      />

      {isLoading ? <PageLoading rows={3} /> : isError ? <PageError onRetry={() => refetch()} /> : projects.length === 0 ? <EmptyState message="No projects yet." /> : (
        <PageGrid cols="auto">
          {projects.map((project) => (
            <Card key={project._id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge className={STATUS_COLORS[project.status] || ''}>{project.status.replace('_', ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Progress</span><span>{project.progress}%</span></div>
                  <input type="range" min={0} max={100} value={project.progress} className="w-full"
                    onChange={(e) => updateProject.mutate({ id: project._id, updates: { progress: Number(e.target.value) } })} />
                </div>
                {project.budget != null && <p className="text-sm">Budget: {formatCurrency(project.budget)} · Spent: {formatCurrency(project.spent || 0)}</p>}
                <div className="flex gap-2 flex-wrap">
                  <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={project.status}
                    onChange={(e) => updateProject.mutate({ id: project._id, updates: { status: e.target.value } })}>
                    {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <Button size="sm" variant="ghost" className="text-error" onClick={() => deleteProject.mutate(project._id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {project.startDate && <p className="text-xs text-muted-foreground">Started {formatDate(project.startDate)}</p>}
              </CardContent>
            </Card>
          ))}
        </PageGrid>
      )}

      <SimpleModal open={showNew} onClose={() => setShowNew(false)} title="New Project">
        <FormStack>
          <FormField><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <FormField><Label>Budget (₹)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!form.name || createProject.isPending} onClick={() => createProject.mutate()}>Create</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
