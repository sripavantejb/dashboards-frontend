'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { formatDate, getInitials } from '@/lib/utils';
import type { Task } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700', assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700', review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-l-gray-300', medium: 'border-l-blue-400', high: 'border-l-orange-400', urgent: 'border-l-red-500',
};
const NEXT_STATUS: Record<string, string> = {
  pending: 'in_progress', assigned: 'in_progress', in_progress: 'review', review: 'completed',
};

export default function TasksPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks?limit=50'),
  });

  const createTask = useMutation({
    mutationFn: () => api.post('/tasks', {
      ...form,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
    }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Task created');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setShowNew(false);
        setForm({ title: '', description: '', priority: 'medium', dueDate: '' });
      }
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      api.patch(`/tasks/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
  });

  const tasks = data?.data || [];
  const grouped = {
    pending: tasks.filter((t) => ['pending', 'assigned'].includes(t.status)),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  return (
    <>
      <PageHeader title="Tasks" description="Manage tasks, checklists, and deadlines"
        action={<Button className="w-full sm:w-auto" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" /> New Task</Button>}
      />

      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading rows={4} /> : (
        <PageGrid cols="4">
          {Object.entries(grouped).map(([col, statusTasks]) => (
            <div key={col} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold capitalize">{col.replace('_', ' ')}</h3>
                <Badge variant="outline">{statusTasks.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {statusTasks.map((task) => (
                  <Card key={task._id} className={`border-l-4 ${PRIORITY_COLORS[task.priority] || ''}`}>
                    <CardContent className="flex flex-col gap-2 p-4">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                      <div className="flex items-center justify-between">
                        {task.assignedTo ? (
                          <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">{getInitials(`${task.assignedTo.firstName} ${task.assignedTo.lastName}`)}</AvatarFallback></Avatar>
                        ) : <span />}
                        {task.dueDate && <span className="text-[10px] text-muted-foreground">{formatDate(task.dueDate)}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {NEXT_STATUS[task.status] && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateTask.mutate({ id: task._id, updates: { status: NEXT_STATUS[task.status] } })}>
                            → {NEXT_STATUS[task.status].replace('_', ' ')}
                          </Button>
                        )}
                        <select className="h-6 rounded border border-input bg-background px-1 text-[10px]" value={task.status}
                          onChange={(e) => updateTask.mutate({ id: task._id, updates: { status: e.target.value } })}>
                          {['pending', 'assigned', 'in_progress', 'review', 'completed', 'cancelled'].map((s) => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-error" onClick={() => deleteTask.mutate(task._id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${STATUS_COLORS[task.status]}`}>{task.priority}</span>
                    </CardContent>
                  </Card>
                ))}
                {statusTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>}
              </div>
            </div>
          ))}
        </PageGrid>
      )}

      <SimpleModal open={showNew} onClose={() => setShowNew(false)} title="New Task">
        <FormStack>
          <FormField><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
          <FormField><Label>Description</Label><textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <FormRow>
            <FormField><Label>Priority</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField><Label>Due Date</Label><Input type="datetime-local" onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></FormField>
          </FormRow>
          <FormActions>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!form.title || createTask.isPending} onClick={() => createTask.mutate()}>{createTask.isPending ? 'Creating...' : 'Create Task'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
