import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormActions, FormField, FormRow, FormStack } from '@/components/layout/page-layout';
import { PageLoading } from '@/components/shared/page-states';
import { LogoInput } from './logo-input';

const PROFILE_FIELDS = [
  'legalName', 'address', 'email', 'phone', 'gst', 'pan', 'cin', 'state', 'stateCode', 'jurisdiction',
  'bankName', 'bankAccountName', 'bankAccountNumber', 'bankIfsc', 'bankAccountType', 'bankUpi',
] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

export interface CompanySettings {
  name: string;
  slug: string;
  website: string;
  industry: string;
  logo: string;
  profile: Record<ProfileField, string>;
}

const SECTIONS: { title: string; fields: [ProfileField, string, string?][] }[] = [
  {
    title: 'Invoice header',
    fields: [
      ['legalName', 'Legal name', 'Printed on invoices'], ['email', 'Billing email'], ['phone', 'Phone'],
      ['gst', 'GSTIN'], ['pan', 'PAN'], ['cin', 'CIN'], ['state', 'State'], ['stateCode', 'State code', 'e.g. 29'], ['jurisdiction', 'Jurisdiction', 'e.g. Bengaluru'],
    ],
  },
  {
    title: 'Bank & payment details',
    fields: [
      ['bankName', 'Bank name'], ['bankAccountName', 'Account name'], ['bankAccountNumber', 'Account number'],
      ['bankIfsc', 'IFSC'], ['bankAccountType', 'Account type', 'e.g. Current Account'], ['bankUpi', 'UPI ID'],
    ],
  },
];

/**
 * Logo and the details printed on invoices and the client portal.
 * `base` is `/settings` for company admins or `/admin/organizations/:id/settings` for platform admins.
 */
export function CompanyProfileCard({ base, onSaved }: { base: string; onSaved?: (company: CompanySettings) => void }) {
  const qc = useQueryClient();
  const key = ['company-settings', base];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.data<CompanySettings>(`${base}/company`) });
  const [form, setForm] = useState<CompanySettings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: CompanySettings) =>
      api.data<CompanySettings>(`${base}/company`, 'PUT', { name: body.name, website: body.website, industry: body.industry, logo: body.logo, profile: body.profile }),
    onSuccess: (saved) => {
      qc.setQueryData(key, saved);
      onSaved?.(saved);
      toast.success('Company details saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) return <Card><CardContent className="p-5 lg:p-6"><PageLoading rows={3} /></CardContent></Card>;

  const set = (patch: Partial<CompanySettings>) => setForm({ ...form, ...patch });
  const setProfile = (field: ProfileField, value: string) => setForm({ ...form, profile: { ...form.profile, [field]: value } });
  const dirty = JSON.stringify(form) !== JSON.stringify(data);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5 lg:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold">Company profile</p>
            <p className="text-sm text-muted-foreground">Logo and details shown in the dashboard, on invoices and in the client portal.</p>
          </div>
        </div>

        <FormStack>
          <FormField>
            <Label>Logo</Label>
            <LogoInput value={form.logo} name={form.name} onChange={(logo) => set({ logo })} />
          </FormField>
          <FormRow>
            <FormField><Label>Company name *</Label><Input value={form.name} onChange={(e) => set({ name: e.target.value })} /></FormField>
            <FormField><Label>Industry</Label><Input value={form.industry} onChange={(e) => set({ industry: e.target.value })} placeholder="Marketing" /></FormField>
          </FormRow>
          <FormRow>
            <FormField><Label>Website</Label><Input value={form.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://…" /></FormField>
            <FormField><Label>Address</Label><Input value={form.profile.address} onChange={(e) => setProfile('address', e.target.value)} placeholder="Registered office address" /></FormField>
          </FormRow>

          {SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-3">
              <p className="pt-2 text-sm font-medium">{section.title}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map(([field, label, placeholder]) => (
                  <FormField key={field}>
                    <Label>{label}</Label>
                    <Input value={form.profile[field]} placeholder={placeholder} onChange={(e) => setProfile(field, e.target.value)} />
                  </FormField>
                ))}
              </div>
            </div>
          ))}

          <FormActions>
            <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => data && setForm(data)}>Reset</Button>
            <Button disabled={!dirty || !form.name.trim() || save.isPending} onClick={() => save.mutate(form)}>{save.isPending ? 'Saving…' : 'Save details'}</Button>
          </FormActions>
        </FormStack>
      </CardContent>
    </Card>
  );
}
