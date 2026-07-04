'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageGrid } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import type { LeadCategory } from '@/types';
import { toast } from 'sonner';

export default function LeadListsPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#3b82f6' });
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['lead-categories'],
    queryFn: () => api.get<LeadCategory[]>('/lead-categories'),
  });

  const createCategory = useMutation({
    mutationFn: () => api.post('/lead-categories', form),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Category created');
        queryClient.invalidateQueries({ queryKey: ['lead-categories'] });
        setShowNew(false);
        setForm({ name: '', description: '', color: '#3b82f6' });
      } else {
        toast.error(res.error?.message || 'Failed to create category');
      }
    },
  });

  const categories = data?.data || [];

  return (
    <>
      <PageHeader
        title="Lead Lists"
        description="Dynamic lead categories — each with its own pipeline and analytics"
        action={
          <Button className="w-full sm:w-auto" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Category
          </Button>
        }
      />

      {isError ? (
        <PageError onRetry={() => refetch()} />
      ) : isLoading ? (
        <PageLoading rows={6} />
      ) : (
        <PageGrid cols="3">
          {categories.map((cat) => (
            <Link key={cat._id} href={`/lead-lists/${cat._id}`}>
              <Card className="hover:shadow-card transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white text-sm font-semibold"
                    style={{ backgroundColor: cat.color || '#111111' }}
                  >
                    {cat.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{cat.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{cat.leadCount} leads</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cat.description || `${cat.pipelineStages.length} pipeline stages`}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </PageGrid>
      )}

      <SimpleModal open={showNew} onClose={() => setShowNew(false)} title="New Category">
        <FormStack>
          <FormField>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField>
            <Label>Color</Label>
            <Input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-10 w-full" />
          </FormField>
          <FormActions>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={form.name.length < 2 || createCategory.isPending} onClick={() => createCategory.mutate()}>
              {createCategory.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
