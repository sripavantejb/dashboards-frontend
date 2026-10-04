import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Download, FileText, MapPin, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormActions, FormField, FormRow, FormStack } from '@/components/layout/page-layout';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { ProgressBar, SectionCard, Select, StatCard, StatusPill, Tabs, Textarea, fmtDate, fmtDateTime, humanize, inr } from '@/components/shared/os-ui';
import { InvoiceSheet, downloadInvoicePdf, type CompanyProfile, type InvoiceData } from '@/components/os/invoice-sheet';
import { ScaledPreview } from './finance';
import { CompanyMark } from '@/components/company/company-mark';

type Any = Record<string, any>;
const pub = <T,>(slug: string, path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) => api.publicData<T>(`/public/${slug}${path}`, method, body);

function PublicShell({ org, logo, children, narrow }: { org?: string; logo?: string; children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className="min-h-screen bg-surface-soft">
      <header className="border-b bg-card">
        <div className={cn('mx-auto flex h-14 items-center gap-3 px-4', narrow ? 'max-w-3xl' : 'max-w-6xl')}>
          <CompanyMark name={org} logo={logo} />
          <span className="font-semibold">{org || 'Editco Media'}</span>
        </div>
      </header>
      <main className={cn('mx-auto flex flex-col gap-6 px-4 py-8', narrow ? 'max-w-3xl' : 'max-w-6xl')}>{children}</main>
    </div>
  );
}

function PublicQuery<T>({ q, children }: { q: { data?: T; isLoading: boolean; isError: boolean; error: Error | null }; children: (d: T) => React.ReactNode }) {
  if (q.isError) return <PublicShell narrow><SectionCard><p className="py-10 text-center text-sm text-muted-foreground">{q.error?.message === 'Request failed' ? 'This link is not valid.' : q.error?.message || 'This link is not valid.'}</p></SectionCard></PublicShell>;
  if (q.isLoading || q.data === undefined) return <PublicShell narrow><PageLoading /></PublicShell>;
  return <>{children(q.data)}</>;
}

function Milestones({ items }: { items: Any[] }) {
  if (!items?.length) return null;
  return (
    <ol className="mt-3 flex flex-wrap gap-2">
      {items.map((m) => (
        <li key={m._id} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', m.status === 'completed' ? 'border-green-200 bg-green-50 text-green-700' : 'bg-card')}>
          {m.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}{m.name}
        </li>
      ))}
    </ol>
  );
}

function ProjectCards({ projects }: { projects: Any[] }) {
  if (!projects.length) return <SectionCard><p className="text-sm text-muted-foreground">No projects yet.</p></SectionCard>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((p) => (
        <SectionCard key={p._id}>
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.service || '—'}</p></div>
            <StatusPill value={p.status} />
          </div>
          <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{p.progress || 0}%</span></div><ProgressBar value={p.progress || 0} /></div>
          {p.expectedDelivery && <p className="mt-3 text-xs text-muted-foreground">Expected delivery {fmtDate(p.expectedDelivery)}</p>}
          <Milestones items={p.milestones} />
        </SectionCard>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- client portal
export function PortalPage() {
  const { slug = '', token = '' } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'updates' | 'invoices' | 'files' | 'meetings' | 'messages' | 'approvals' | 'requests'>('overview');
  const [msg, setMsg] = useState('');
  const [ticket, setTicket] = useState({ title: '', body: '', kind: 'question' });
  const q = useQuery({ queryKey: ['portal', slug, token], queryFn: () => pub<Any>(slug, `/portal/${token}`), retry: false });
  const postComment = useMutation({
    mutationFn: () => pub(slug, `/portal/${token}/comments`, 'POST', { body: msg }),
    onSuccess: () => { setMsg(''); qc.invalidateQueries({ queryKey: ['portal', slug, token] }); toast.success('Message sent'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => pub(slug, `/portal/${token}/approvals/${id}`, 'POST', { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', slug, token] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const fileTicket = useMutation({
    mutationFn: () => pub(slug, `/portal/${token}/tickets`, 'POST', ticket),
    onSuccess: () => { setTicket({ title: '', body: '', kind: 'question' }); qc.invalidateQueries({ queryKey: ['portal', slug, token] }); toast.success('Request received'); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <PublicQuery q={q}>
      {(d) => (
        <PublicShell org={d.organization.name} logo={d.organization.logo}>
          <div>
            <p className="text-sm text-muted-foreground">Client portal · {d.client.publicCode}</p>
            <h1 className="text-2xl font-semibold">{d.client.companyName}</h1>
            {d.client.contactPerson && <p className="text-sm text-muted-foreground">Welcome, {d.client.contactPerson}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Projects" value={d.rollup.projectCount} hint={`${d.rollup.activeProjects} active`} />
            <StatCard label="Invoiced" value={inr(d.rollup.invoiced)} />
            <StatCard label="Paid" value={inr(d.rollup.received)} hint={`${d.rollup.collectedPct}% collected`} tone="success" />
            <StatCard label="Outstanding" value={inr(d.rollup.outstanding)} tone={d.rollup.outstanding ? 'danger' : 'default'} />
          </div>
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: 'overview', label: 'Overview' }, { id: 'updates', label: 'Updates', count: d.updates.length },
            { id: 'invoices', label: 'Invoices', count: d.invoices.length }, { id: 'files', label: 'Files', count: d.documents.length },
            { id: 'meetings', label: 'Meetings', count: d.meetings.length },
            { id: 'messages', label: 'Messages', count: (d.comments || []).length },
            { id: 'approvals', label: 'Approvals', count: (d.approvals || []).length },
            { id: 'requests', label: 'Requests', count: (d.tickets || []).length },
          ]} />
          {tab === 'overview' && (
            <>
              {d.tasks.length > 0 && (
                <SectionCard title="Waiting on you">
                  <ul className="divide-y">
                    {d.tasks.map((t: Any) => (
                      <li key={t._id} className="flex items-start justify-between gap-3 py-2 text-sm">
                        <div><p className="font-medium">{t.title}</p>{t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}</div>
                        <span className="shrink-0 text-xs text-muted-foreground">{t.dueDate ? `Due ${fmtDate(t.dueDate)}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
              <ProjectCards projects={d.projects} />
            </>
          )}
          {tab === 'updates' && (
            <SectionCard>
              {d.updates.length ? (
                <ul className="flex flex-col gap-5">
                  {d.updates.map((u: Any) => (
                    <li key={u._id}>
                      <p className="font-medium">{u.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(u.publishedAt)}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{u.body}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No updates yet.</p>}
            </SectionCard>
          )}
          {tab === 'invoices' && (
            <SectionCard>
              {d.invoices.length ? (
                <ul className="divide-y">
                  {d.invoices.map((i: Any) => (
                    <li key={i._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <Link to={`/portal/${slug}/${token}/invoices/${i._id}`} className="font-mono font-medium hover:underline">{i.invoiceNumber}</Link>
                      <span className="text-muted-foreground">{fmtDate(i.issueDate)}</span>
                      <span className="ml-auto">{inr(i.total)}</span>
                      <StatusPill value={i.displayStatus || i.status} />
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No invoices yet.</p>}
            </SectionCard>
          )}
          {tab === 'files' && (
            <SectionCard>
              {d.documents.length ? (
                <ul className="divide-y">
                  {d.documents.map((f: Any) => (
                    <li key={f._id} className="flex items-center gap-3 py-3 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{f.title}<span className="ml-2 text-xs text-muted-foreground">{f.fileName}</span></span>
                      <Button size="sm" variant="outline" asChild><a href={`${api.baseUrl}/public/${slug}/portal/${token}/documents/${f._id}`}><Download className="mr-1.5 h-3.5 w-3.5" />Download</a></Button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No shared files.</p>}
            </SectionCard>
          )}
          {tab === 'meetings' && (
            <SectionCard>
              {d.meetings.length ? (
                <ul className="flex flex-col gap-4">
                  {d.meetings.map((m: Any) => (
                    <li key={m._id} className="text-sm">
                      <p className="font-medium">{m.title} <span className="font-normal text-muted-foreground">· {fmtDateTime(m.startsAt)}</span></p>
                      {m.decisions && <p className="mt-1"><span className="text-muted-foreground">Decisions:</span> {m.decisions}</p>}
                      {m.actionItems && <p className="mt-1 whitespace-pre-wrap"><span className="text-muted-foreground">Action items:</span> {m.actionItems}</p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No meetings shared.</p>}
            </SectionCard>
          )}
          {tab === 'messages' && (
            <SectionCard title="Conversation">
              <ul className="mb-4 flex flex-col gap-3">
                {(d.comments || []).length ? (d.comments as Any[]).map((c) => (
                  <li key={c._id} className="text-sm"><p className="text-xs text-muted-foreground">{c.authorName || c.authorType} · {fmtDateTime(c.createdAt)}</p><p className="whitespace-pre-wrap">{c.body}</p></li>
                )) : <p className="text-sm text-muted-foreground">No messages yet. Write to your team below.</p>}
              </ul>
              <FormStack>
                <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ask a question or share feedback…" />
                <FormActions><Button disabled={!msg.trim() || postComment.isPending} onClick={() => postComment.mutate()}>{postComment.isPending ? 'Sending…' : 'Send'}</Button></FormActions>
              </FormStack>
            </SectionCard>
          )}
          {tab === 'approvals' && (
            <SectionCard>
              {(d.approvals || []).length ? (d.approvals as Any[]).map((a) => (
                <div key={a._id} className="border-b py-3 last:border-0">
                  <div className="flex items-center justify-between gap-2"><p className="font-medium">{a.title}</p><StatusPill value={a.status} /></div>
                  {a.detail && <p className="mt-1 text-sm text-muted-foreground">{a.detail}</p>}
                  {a.status === 'pending' && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => decide.mutate({ id: a._id, status: 'approved' })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a._id, status: 'changes_requested' })}>Request changes</Button>
                    </div>
                  )}
                </div>
              )) : <p className="text-sm text-muted-foreground">Nothing waiting on you.</p>}
            </SectionCard>
          )}
          {tab === 'requests' && (
            <SectionCard title="Change request or brief">
              {(d.tickets || []).length ? (d.tickets as Any[]).map((t) => (
                <div key={t._id} className="mb-3 text-sm"><p className="font-medium">{t.title} <StatusPill value={t.status} /></p><p className="text-muted-foreground">{t.body}</p>{t.staffReply && <p className="mt-1">Reply: {t.staffReply}</p>}</div>
              )) : null}
              <FormStack>
                <FormField><Label>Title</Label><Input value={ticket.title} onChange={(e) => setTicket({ ...ticket, title: e.target.value })} /></FormField>
                <FormField><Label>Type</Label><Select value={ticket.kind} onChange={(e) => setTicket({ ...ticket, kind: e.target.value })}>{['change_request', 'brief', 'issue', 'question'].map((k) => <option key={k} value={k}>{humanize(k)}</option>)}</Select></FormField>
                <FormField><Label>Details</Label><Textarea value={ticket.body} onChange={(e) => setTicket({ ...ticket, body: e.target.value })} /></FormField>
                <FormActions><Button disabled={!ticket.title.trim() || fileTicket.isPending} onClick={() => fileTicket.mutate()}>{fileTicket.isPending ? 'Sending…' : 'Submit request'}</Button></FormActions>
              </FormStack>
            </SectionCard>
          )}
        </PublicShell>
      )}
    </PublicQuery>
  );
}

export function PortalInvoicePage() {
  const { slug = '', token = '', id = '' } = useParams();
  const sheet = useRef<HTMLDivElement>(null);
  const q = useQuery({ queryKey: ['portal-invoice', slug, token, id], queryFn: () => pub<{ organization: Any; company: CompanyProfile; invoice: Any }>(slug, `/portal/${token}/invoices/${id}`), retry: false });
  return (
    <PublicQuery q={q}>
      {({ organization, company, invoice }) => {
        const data: InvoiceData = { ...invoice, status: invoice.displayStatus || invoice.status, lineItems: invoice.lineItems || [], taxRate: invoice.taxRate ?? 0.18 };
        return (
          <PublicShell org={organization.name} logo={organization.logo}>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" asChild><Link to={`/portal/${slug}/${token}`}><ArrowLeft className="mr-1 h-4 w-4" />Back to portal</Link></Button>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button onClick={() => sheet.current && downloadInvoicePdf(sheet.current, `${invoice.invoiceNumber}.pdf`).catch(() => toast.error('Could not create the PDF'))}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[794px]">
              <ScaledPreview><InvoiceSheet ref={sheet} data={data} company={company} /></ScaledPreview>
            </div>
          </PublicShell>
        );
      }}
    </PublicQuery>
  );
}

// ---------------------------------------------------------------- tracking
export function TrackPage() {
  const { slug = '', code = '' } = useParams();
  const q = useQuery({ queryKey: ['track', slug, code], queryFn: () => pub<Any>(slug, `/track/${code}`), retry: false });
  return (
    <PublicQuery q={q}>
      {(d) => (
        <PublicShell org={d.organization.name} logo={d.organization.logo}>
          <div>
            <p className="font-mono text-sm text-muted-foreground">{d.publicCode}</p>
            <h1 className="text-2xl font-semibold">{d.clientName || 'Project status'}</h1>
            {d.nextDelivery && <p className="text-sm text-muted-foreground">Next delivery {fmtDate(d.nextDelivery)}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Invoiced" value={inr(d.money.invoiced)} />
            <StatCard label="Received" value={inr(d.money.received)} tone="success" />
            <StatCard label="Outstanding" value={inr(d.money.outstanding)} tone={d.money.outstanding ? 'danger' : 'default'} />
          </div>
          <ProjectCards projects={d.projects} />
          {d.invoices.length > 0 && (
            <SectionCard title="Invoices">
              <ul className="divide-y">
                {d.invoices.map((i: Any) => (
                  <li key={i._id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="font-mono">{i.invoiceNumber}</span>
                    <span className="text-muted-foreground">{fmtDate(i.issueDate)}</span>
                    <span className="ml-auto">{inr(i.total)}</span>
                    <StatusPill value={i.displayStatus || i.status} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </PublicShell>
      )}
    </PublicQuery>
  );
}

// ---------------------------------------------------------------- careers
export function CareersPage() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['careers', slug], queryFn: () => pub<{ organization: Any; jobs: Any[] }>(slug, '/careers'), retry: false });
  return (
    <PublicQuery q={q}>
      {(d) => (
        <PublicShell org={d.organization.name} logo={d.organization.logo} narrow>
          <div><h1 className="text-2xl font-semibold">Careers at {d.organization.name}</h1><p className="text-sm text-muted-foreground">{d.jobs.length} open {d.jobs.length === 1 ? 'role' : 'roles'}</p></div>
          {d.jobs.length ? d.jobs.map((j) => (
            <Link key={j._id} to={`/careers/${slug}/${j.slug}`} className="block rounded-lg border bg-card p-5 shadow-card transition-colors hover:border-primary/40">
              <p className="font-semibold">{j.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {j.department && <span>{j.department}</span>}<span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span><span>{humanize(j.employmentType)}</span>
              </p>
              {j.summary && <p className="mt-2 text-sm text-muted-foreground">{j.summary}</p>}
            </Link>
          )) : <SectionCard><p className="py-6 text-center text-sm text-muted-foreground">No openings right now — check back soon.</p></SectionCard>}
        </PublicShell>
      )}
    </PublicQuery>
  );
}

export function CareerJobPage() {
  const { slug = '', jobSlug = '' } = useParams();
  const q = useQuery({ queryKey: ['career', slug, jobSlug], queryFn: () => pub<Any>(slug, `/careers/${jobSlug}`), retry: false });
  const [form, setForm] = useState<Any>({ applicantName: '', applicantEmail: '', applicantPhone: '' });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState('');
  const apply = useMutation({
    mutationFn: () => pub<{ message: string }>(slug, `/careers/${jobSlug}/apply`, 'POST', { ...form, applicantEmail: form.applicantEmail || undefined, answers }),
    onSuccess: (r) => setDone(r.message),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <PublicQuery q={q}>
      {(job) => (
        <PublicShell narrow>
          <Button variant="ghost" size="sm" className="self-start" asChild><Link to={`/careers/${slug}`}><ArrowLeft className="mr-1 h-4 w-4" />All roles</Link></Button>
          <div>
            <h1 className="text-2xl font-semibold">{job.title}</h1>
            <p className="text-sm text-muted-foreground">{[job.department, job.location, humanize(job.employmentType)].filter(Boolean).join(' · ')}</p>
          </div>
          {[['About the role', job.description], ['Requirements', job.requirements], ['Benefits', job.benefits]].filter(([, v]) => v).map(([t, v]) => (
            <SectionCard key={t} title={t}><p className="whitespace-pre-wrap text-sm">{v}</p></SectionCard>
          ))}
          <SectionCard title="Apply">
            {done ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center"><CheckCircle2 className="h-8 w-8 text-success" /><p className="font-medium">{done}</p></div>
            ) : (
              <FormStack>
                <FormField><Label>Full name *</Label><Input value={form.applicantName} onChange={(e) => setForm({ ...form, applicantName: e.target.value })} /></FormField>
                <FormRow>
                  <FormField><Label>Email</Label><Input type="email" value={form.applicantEmail} onChange={(e) => setForm({ ...form, applicantEmail: e.target.value })} /></FormField>
                  <FormField><Label>Phone</Label><Input value={form.applicantPhone} onChange={(e) => setForm({ ...form, applicantPhone: e.target.value })} /></FormField>
                </FormRow>
                {(job.formFields || []).map((f: Any) => (
                  <FormField key={f.id}>
                    <Label>{f.label}{f.required && ' *'}</Label>
                    {f.type === 'textarea' ? <Textarea value={answers[f.id] || ''} placeholder={f.placeholder} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })} />
                      : f.type === 'select' ? <Select value={answers[f.id] || ''} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })}><option value="">Select…</option>{(f.options || []).map((o: Any) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
                        : <Input type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'} value={answers[f.id] || ''} placeholder={f.placeholder} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })} />}
                    {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
                  </FormField>
                ))}
                <FormActions>
                  <Button disabled={!form.applicantName.trim() || (job.formFields || []).some((f: Any) => f.required && !answers[f.id]?.trim()) || apply.isPending} onClick={() => apply.mutate()}>{apply.isPending ? 'Submitting…' : 'Submit application'}</Button>
                </FormActions>
              </FormStack>
            )}
          </SectionCard>
        </PublicShell>
      )}
    </PublicQuery>
  );
}

// ---------------------------------------------------------------- refer & earn
export function ReferPage() {
  const { slug = '' } = useParams();
  const [tab, setTab] = useState<'join' | 'refer' | 'status'>('join');
  const [join, setJoin] = useState({ fullName: '', email: '', phone: '' });
  const [code, setCode] = useState('');
  const [ref, setRef] = useState<Any>({ referredName: '', referredBusiness: '', referredEmail: '', referredPhone: '', referredNeeds: '', referrerNotes: '', consentToIntroEmail: false, mentionReferrerName: false });
  const [lookup, setLookup] = useState({ code: '', email: '' });
  const [status, setStatus] = useState<Any | null>(null);
  const [submitted, setSubmitted] = useState('');
  const onErr = (e: Error) => toast.error(e.message);
  const joinM = useMutation({ mutationFn: () => pub<{ referralCode: string; existing: boolean }>(slug, '/referrers', 'POST', join), onSuccess: (r) => { setCode(r.referralCode); setLookup({ code: r.referralCode, email: join.email }); toast.success(r.existing ? 'Welcome back — here is your code' : 'You are in!'); }, onError: onErr });
  const refM = useMutation({ mutationFn: () => pub<{ message: string }>(slug, '/referrals', 'POST', { ...ref, referralCode: code }), onSuccess: (r) => setSubmitted(r.message), onError: onErr });
  const statusM = useMutation({ mutationFn: () => pub<Any>(slug, `/referrers/${encodeURIComponent(lookup.code)}?email=${encodeURIComponent(lookup.email)}`), onSuccess: setStatus, onError: () => toast.error('No referrer found for that code and email') });
  return (
    <PublicShell narrow>
      <div>
        <h1 className="text-2xl font-semibold">Refer & Earn</h1>
        <p className="text-sm text-muted-foreground">Introduce a business that needs a website, CRM or AI growth system. When they sign, you earn a reward.</p>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'join', label: 'Get your code' }, { id: 'refer', label: 'Refer a business' }, { id: 'status', label: 'Track referrals' }]} />
      {tab === 'join' && (
        <SectionCard>
          {code ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">Your referral code</p>
              <p className="rounded-md border bg-surface-soft px-6 py-3 font-mono text-2xl font-bold tracking-widest">{code}</p>
              <Button onClick={() => setTab('refer')}>Refer a business</Button>
            </div>
          ) : (
            <FormStack>
              <FormField><Label>Full name *</Label><Input value={join.fullName} onChange={(e) => setJoin({ ...join, fullName: e.target.value })} /></FormField>
              <FormRow>
                <FormField><Label>Email *</Label><Input type="email" value={join.email} onChange={(e) => setJoin({ ...join, email: e.target.value })} /></FormField>
                <FormField><Label>Phone</Label><Input value={join.phone} onChange={(e) => setJoin({ ...join, phone: e.target.value })} /></FormField>
              </FormRow>
              <FormActions><Button disabled={!join.fullName.trim() || !join.email.trim() || joinM.isPending} onClick={() => joinM.mutate()}>Get my code</Button></FormActions>
            </FormStack>
          )}
        </SectionCard>
      )}
      {tab === 'refer' && (
        <SectionCard>
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" /><p className="font-medium">{submitted}</p>
              <Button variant="outline" onClick={() => { setSubmitted(''); setRef({ ...ref, referredName: '', referredBusiness: '', referredEmail: '', referredPhone: '', referredNeeds: '', referrerNotes: '' }); }}>Refer another</Button>
            </div>
          ) : (
            <FormStack>
              <FormField><Label>Your referral code *</Label><Input className="font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></FormField>
              <FormRow>
                <FormField><Label>Contact name *</Label><Input value={ref.referredName} onChange={(e) => setRef({ ...ref, referredName: e.target.value })} /></FormField>
                <FormField><Label>Business</Label><Input value={ref.referredBusiness} onChange={(e) => setRef({ ...ref, referredBusiness: e.target.value })} /></FormField>
              </FormRow>
              <FormRow>
                <FormField><Label>Email</Label><Input type="email" value={ref.referredEmail} onChange={(e) => setRef({ ...ref, referredEmail: e.target.value })} /></FormField>
                <FormField><Label>Phone</Label><Input value={ref.referredPhone} onChange={(e) => setRef({ ...ref, referredPhone: e.target.value })} /></FormField>
              </FormRow>
              <FormField><Label>What do they need?</Label><Textarea value={ref.referredNeeds} onChange={(e) => setRef({ ...ref, referredNeeds: e.target.value })} /></FormField>
              <FormField><Label>Anything we should know?</Label><Textarea value={ref.referrerNotes} onChange={(e) => setRef({ ...ref, referrerNotes: e.target.value })} /></FormField>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ref.consentToIntroEmail} onChange={(e) => setRef({ ...ref, consentToIntroEmail: e.target.checked })} />They're happy to receive an intro email</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ref.mentionReferrerName} onChange={(e) => setRef({ ...ref, mentionReferrerName: e.target.checked })} />You can mention my name</label>
              <p className="text-xs text-muted-foreground">Add at least an email or a phone number.</p>
              <FormActions><Button disabled={!code.trim() || !ref.referredName.trim() || (!ref.referredEmail.trim() && !ref.referredPhone.trim()) || refM.isPending} onClick={() => refM.mutate()}>Submit referral</Button></FormActions>
            </FormStack>
          )}
        </SectionCard>
      )}
      {tab === 'status' && (
        <>
          <SectionCard>
            <FormStack>
              <FormRow>
                <FormField><Label>Referral code</Label><Input className="font-mono uppercase" value={lookup.code} onChange={(e) => setLookup({ ...lookup, code: e.target.value.toUpperCase() })} /></FormField>
                <FormField><Label>Your email</Label><Input type="email" value={lookup.email} onChange={(e) => setLookup({ ...lookup, email: e.target.value })} /></FormField>
              </FormRow>
              <FormActions><Button disabled={!lookup.code || !lookup.email || statusM.isPending} onClick={() => statusM.mutate()}>Check status</Button></FormActions>
            </FormStack>
          </SectionCard>
          {status && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Successful referrals" value={status.referrer.successfulReferralCount} />
                <StatCard label="Earned" value={inr(status.referrer.totalRewardEarned)} tone="success" />
                <StatCard label="Paid out" value={inr(status.referrer.totalRewardPaid)} />
              </div>
              <SectionCard title={`Your referrals (${status.referrals.length})`}>
                {status.referrals.length ? (
                  <ul className="divide-y">
                    {status.referrals.map((r: Any) => (
                      <li key={r._id} className="flex items-center gap-3 py-2 text-sm">
                        <span className="flex-1">{r.referredBusiness || r.referredName}</span>
                        {r.rewardAmount > 0 && <span>{inr(r.rewardAmount)}</span>}
                        <StatusPill value={r.stage} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">No referrals yet.</p>}
              </SectionCard>
            </>
          )}
        </>
      )}
    </PublicShell>
  );
}

// ---------------------------------------------------------------- EGA application
export function EgaApplyPage() {
  const { slug = '' } = useParams();
  const formQ = useQuery({ queryKey: ['ega-public', slug], queryFn: () => pub<Any>(slug, '/ega/form') });
  const [answers, setAnswers] = useState<Any>({});
  const [done, setDone] = useState('');
  const submit = useMutation({
    mutationFn: () => pub<{ message: string }>(slug, '/ega', 'POST', { answers }),
    onSuccess: (r) => setDone(r.message),
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (id: string, v: unknown) => setAnswers((prev: Any) => ({ ...prev, [id]: v }));
  const renderField = (f: Any) => {
    const v = answers[f.id];
    if (f.type === 'textarea') return <Textarea value={v || ''} onChange={(e) => set(f.id, e.target.value)} placeholder={f.placeholder} />;
    if (f.type === 'select') return <Select value={v || ''} onChange={(e) => set(f.id, e.target.value)}><option value="">Select…</option>{(f.options || []).map((o: Any) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>;
    if (f.type === 'multiselect') {
      const arr: string[] = Array.isArray(v) ? v : [];
      return (
        <div className="flex flex-wrap gap-2">
          {(f.options || []).map((o: Any) => {
            const on = arr.includes(o.value);
            return <button type="button" key={o.value} onClick={() => set(f.id, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])} className={cn('rounded-md border px-3 py-1 text-xs', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>{o.label}</button>;
          })}
        </div>
      );
    }
    if (f.type === 'scale') {
      return <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => set(f.id, n)} className={cn('h-9 w-9 rounded-md border text-sm', v === n ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>{n}</button>)}</div>;
    }
    return <Input type={f.type === 'email' ? 'email' : 'text'} value={v || ''} onChange={(e) => set(f.id, e.target.value)} placeholder={f.placeholder} />;
  };
  if (done) {
    return <PublicShell narrow><SectionCard><div className="flex flex-col items-center gap-2 py-10 text-center"><CheckCircle2 className="h-10 w-10 text-success" /><p className="text-lg font-medium">{done}</p><p className="text-sm text-muted-foreground">We review every application and will reach out if you're shortlisted.</p></div></SectionCard></PublicShell>;
  }
  return (
    <PublicQuery q={formQ}>
      {(cfg) => {
        const fields: Any[] = cfg.published === false ? [] : cfg.fields || [];
        const sections = [...new Set(fields.map((f) => f.section || 'Application'))];
        if (cfg.published === false) {
          return <PublicShell org={cfg.organization?.name} logo={cfg.organization?.logo} narrow><SectionCard><p className="py-10 text-center text-sm text-muted-foreground">This form is not open right now.</p></SectionCard></PublicShell>;
        }
        return (
          <PublicShell org={cfg.organization?.name} logo={cfg.organization?.logo} narrow>
            <div><h1 className="text-2xl font-semibold">{cfg.title}</h1><p className="text-sm text-muted-foreground">{cfg.subtitle}</p></div>
            {sections.map((section) => (
              <SectionCard key={section} title={section}>
                <FormStack>
                  {fields.filter((f) => (f.section || 'Application') === section).map((f) => (
                    <FormField key={f.id}><Label>{f.label}{f.required ? ' *' : ''}</Label>{renderField(f)}{f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}</FormField>
                  ))}
                </FormStack>
              </SectionCard>
            ))}
            <FormActions><Button disabled={submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? 'Submitting…' : 'Submit application'}</Button></FormActions>
          </PublicShell>
        );
      }}
    </PublicQuery>
  );
}

function SubscribeBox({ slug, source }: { slug: string; source: string }) {
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState('');
  const sub = useMutation({
    mutationFn: () => pub<{ message: string }>(slug, '/newsletter', 'POST', { email, source }),
    onSuccess: (r) => { setOk(r.message); setEmail(''); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (ok) return <p className="text-sm text-success">{ok}</p>;
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button disabled={!email.trim() || sub.isPending} onClick={() => sub.mutate()}>{sub.isPending ? '…' : 'Subscribe'}</Button>
    </div>
  );
}

export function NewsletterSubscribePage() {
  const { slug = '' } = useParams();
  return (
    <PublicShell narrow>
      <div><h1 className="text-2xl font-semibold">Subscribe</h1><p className="text-sm text-muted-foreground">Get issues and campaigns in your inbox.</p></div>
      <SectionCard><SubscribeBox slug={slug} source="subscribe_page" /></SectionCard>
      <p className="text-sm"><Link className="underline" to={`/magazine/${slug}`}>Read the magazine</Link></p>
    </PublicShell>
  );
}

export function MagazineHomePage() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['magazine', slug], queryFn: () => pub<Any>(slug, '/magazine') });
  return (
    <PublicQuery q={q}>
      {(d) => (
        <PublicShell org={d.organization.name} logo={d.organization.logo}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div><p className="text-sm text-muted-foreground">Magazine</p><h1 className="text-3xl font-semibold">{d.organization.name}</h1></div>
            <div className="md:w-80"><SubscribeBox slug={slug} source="magazine" /></div>
          </div>
          {!d.articles?.length && <SectionCard><p className="py-8 text-center text-sm text-muted-foreground">No stories published yet.</p></SectionCard>}
          <div className="grid gap-6 md:grid-cols-2">
            {(d.articles || []).map((a: Any) => (
              <Link key={a._id} to={`/magazine/${slug}/${a.slug}`} className="block">
                <SectionCard>
                  {a.cover && <img src={a.cover} alt="" className="mb-3 h-40 w-full object-cover" />}
                  <p className="text-xs text-muted-foreground">{fmtDate(a.publishedAt)}</p>
                  <h2 className="text-lg font-semibold">{a.title}</h2>
                  {a.excerpt && <p className="mt-1 text-sm text-muted-foreground">{a.excerpt}</p>}
                </SectionCard>
              </Link>
            ))}
          </div>
        </PublicShell>
      )}
    </PublicQuery>
  );
}

export function MagazineArticlePage() {
  const { slug = '', articleSlug = '' } = useParams();
  const q = useQuery({ queryKey: ['magazine', slug, articleSlug], queryFn: () => pub<Any>(slug, `/magazine/${articleSlug}`) });
  return (
    <PublicQuery q={q}>
      {(d) => (
        <PublicShell org={d.organization.name} logo={d.organization.logo} narrow>
          <Link to={`/magazine/${slug}`} className="text-sm text-muted-foreground hover:underline">← Magazine</Link>
          <p className="text-xs text-muted-foreground">{fmtDate(d.article.publishedAt)}</p>
          <h1 className="text-3xl font-semibold">{d.article.title}</h1>
          {d.article.cover && <img src={d.article.cover} alt="" className="h-56 w-full object-cover" />}
          <article className="whitespace-pre-wrap text-sm leading-relaxed">{d.article.body}</article>
          <SectionCard title="Subscribe"><SubscribeBox slug={slug} source="article" /></SectionCard>
          {!!d.more?.length && (
            <SectionCard title="More">
              <ul className="flex flex-col gap-2">{d.more.map((a: Any) => <li key={a.slug}><Link className="hover:underline" to={`/magazine/${slug}/${a.slug}`}>{a.title}</Link></li>)}</ul>
            </SectionCard>
          )}
        </PublicShell>
      )}
    </PublicQuery>
  );
}