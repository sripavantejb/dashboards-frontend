'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormRow, FormStack, PageNarrow } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PageError } from '@/components/shared/page-states';
import type { LeadCategory } from '@/types';
import { toast } from 'sonner';

export default function NewLeadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    categoryId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    status: 'new',
    notes: '',
  });

  const { data: catData, isError: catError, refetch } = useQuery({
    queryKey: ['lead-categories'],
    queryFn: () => api.get<LeadCategory[]>('/lead-categories'),
  });

  const categories = catData?.data || [];

  const mutation = useMutation({
    mutationFn: () => api.post('/leads', {
      ...form,
      email: form.email || undefined,
    }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Lead created');
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        router.push(`/crm/${(res.data as { _id: string })._id}`);
      } else {
        toast.error(res.error?.message || 'Failed to create lead');
      }
    },
    onError: () => toast.error('Failed to create lead'),
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  if (catError) return <PageError onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Add Lead"
        description="Create a new lead in your CRM"
        action={
          <Link href="/crm">
            <Button variant="outline" className="w-full sm:w-auto"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          </Link>
        }
      />

      <PageNarrow>
      <Card>
        <CardContent className="pt-5 lg:pt-6">
        <FormStack>
          <FormField>
            <Label>Category *</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              required
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </FormField>

          <FormRow>
            <FormField>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
            </FormField>
            <FormField>
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </FormField>
            <FormField>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField>
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => update('company', e.target.value)} />
            </FormField>
            <FormField>
              <Label>Source</Label>
              <Input value={form.source} onChange={(e) => update('source', e.target.value)} placeholder="Website, Referral..." />
            </FormField>
          </FormRow>

          <FormField>
            <Label>Notes</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </FormField>

          <FormActions>
            <Link href="/crm"><Button variant="outline" className="w-full sm:w-auto">Cancel</Button></Link>
            <Button
              className="w-full sm:w-auto"
              disabled={!form.categoryId || !form.firstName || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Creating...' : 'Create Lead'}
            </Button>
          </FormActions>
        </FormStack>
        </CardContent>
      </Card>
      </PageNarrow>
    </>
  );
}
