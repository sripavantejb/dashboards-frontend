import { useState, type ChangeEvent, type ComponentProps } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageGrid } from '@/components/layout/page-layout';
import { SectionCard } from '@/components/shared/os-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FoundLead = {
  contactPerson: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  state: string;
  country: string;
  industry: string;
  source: 'google' | 'apollo' | 'website';
  title: string;
  notes: string;
};

type SearchResult = {
  plan: { mapsQuery: string; titles: string[]; keywords: string };
  sources: { web: boolean; maps: boolean; apollo: boolean; model: string };
  messages: { web: string; maps: string; apollo: string };
  leads: FoundLead[];
};

const empty = {
  keyword: '',
  city: '',
  state: '',
  country: 'India',
  industry: '',
  titles: 'Owner, Founder, Director',
  employeeMin: '',
  employeeMax: '',
};

export function LeadFinderPage() {
  const [form, setForm] = useState(empty);
  const [web, setWeb] = useState(true);
  const [maps, setMaps] = useState(false);
  const [apollo, setApollo] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const sources = useQuery({
    queryKey: ['sales', '/lead-finder/sources'],
    queryFn: () => api.data<{ web: boolean; maps: boolean; apollo: boolean; model: string }>('/sales-crm/lead-finder/sources'),
  });
  const search = useMutation({
    mutationFn: () => api.data<SearchResult>('/sales-crm/lead-finder/search', 'POST', {
      keyword: form.keyword,
      city: form.city,
      state: form.state,
      country: form.country,
      industry: form.industry,
      titles: form.titles,
      employeeMin: form.employeeMin === '' ? undefined : Number(form.employeeMin),
      employeeMax: form.employeeMax === '' ? undefined : Number(form.employeeMax),
      sources: [web ? 'web' : '', maps ? 'maps' : '', apollo ? 'apollo' : ''].filter(Boolean),
    }),
    onSuccess: (data) => setPicked(data.leads.map((_, i) => i)),
  });
  const save = useMutation({
    mutationFn: (leads: FoundLead[]) => api.data<{ created: number; skipped: number }>('/sales-crm/lead-finder/import', 'POST', { leads }),
  });
  const leads = search.data?.leads || [];
  const selected = picked.map((i) => leads[i]).filter(Boolean);
  const set = (key: keyof typeof empty) => (event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <>
      <PageHeader
        title="Lead finder"
        description="Search runs through OpenAI. A contact is shown only when its phone or email is copied from a page that search opened. Guessed or mock contacts are dropped."
      />
      <PageGrid cols="3">
        <SectionCard title="Sources">
          <p className="text-sm">OpenAI search: {sources.data?.web ? `connected (${sources.data.model})` : 'add LLM_API_KEY on the backend'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Google Maps: {sources.data?.maps ? 'key connected' : 'optional'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Apollo.io: {sources.data?.apollo ? 'key connected' : 'optional'}</p>
        </SectionCard>
      </PageGrid>

      <SectionCard title="Filters">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="What to find" value={form.keyword} onChange={set('keyword')} placeholder="dental clinics" />
          <Field label="Industry" value={form.industry} onChange={set('industry')} placeholder="healthcare" />
          <Field label="City" value={form.city} onChange={set('city')} placeholder="Hyderabad" />
          <Field label="State" value={form.state} onChange={set('state')} placeholder="Telangana" />
          <Field label="Country" value={form.country} onChange={set('country')} />
          <Field label="Job titles for Apollo" value={form.titles} onChange={set('titles')} placeholder="Owner, Founder" />
          <Field label="Min employees" value={form.employeeMin} onChange={set('employeeMin')} placeholder="1" />
          <Field label="Max employees" value={form.employeeMax} onChange={set('employeeMax')} placeholder="50" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} /> OpenAI search</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={maps} onChange={(e) => setMaps(e.target.checked)} /> Google Maps</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={apollo} onChange={(e) => setApollo(e.target.checked)} /> Apollo.io</label>
          <Button disabled={search.isPending || !form.keyword.trim() || (!web && !maps && !apollo)} onClick={() => search.mutate()}>
            {search.isPending ? 'Searching…' : 'Find leads'}
          </Button>
        </div>
        {search.isError ? <p className="mt-2 text-sm text-destructive">{search.error instanceof Error ? search.error.message : 'Search failed'}</p> : null}
      </SectionCard>

      {search.data ? (
        <SectionCard
          title={`${leads.length} contacts`}
          action={
            <Button
              size="sm"
              disabled={!selected.length || save.isPending}
              onClick={() => save.mutate(selected)}
            >
              {save.isPending ? 'Adding…' : `Add ${selected.length} to leads`}
            </Button>
          }
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Maps query: {search.data.plan.mapsQuery}. Apollo keywords: {search.data.plan.keywords}.
            {search.data.messages.web ? ` ${search.data.messages.web}` : ''}
            {search.data.messages.maps && maps ? ` ${search.data.messages.maps}.` : ''}
            {search.data.messages.apollo && apollo ? ` ${search.data.messages.apollo}.` : ''}
          </p>
          {save.data ? <p className="mb-3 text-sm">Added {save.data.created}. Skipped {save.data.skipped} already in the CRM.</p> : null}
          {save.isError ? <p className="mb-3 text-sm text-destructive">{save.error instanceof Error ? save.error.message : 'Could not add leads'}</p> : null}
          {leads.length === 0 ? <p className="text-sm text-muted-foreground">No verified contacts. Nothing was invented to fill the list.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2" />
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Mobile</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Place</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => (
                    <tr key={`${lead.source}-${lead.contactPerson}-${index}`} className="border-t">
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={picked.includes(index)}
                          onChange={(e) => setPicked((prev) => e.target.checked ? [...prev, index] : prev.filter((i) => i !== index))}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{lead.contactPerson}</p>
                        <p className="text-xs text-muted-foreground">{[lead.title, lead.company].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="py-2 pr-3">{lead.phone || '—'}</td>
                      <td className="py-2 pr-3">{lead.email || '—'}</td>
                      <td className="py-2 pr-3">{[lead.city, lead.state].filter(Boolean).join(', ') || '—'}</td>
                      <td className="py-2">{lead.source === 'google' ? 'Google Maps' : lead.source === 'apollo' ? 'Apollo' : 'OpenAI search'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}
    </>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}
