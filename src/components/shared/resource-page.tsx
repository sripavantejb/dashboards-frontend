import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCan } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import { FormActions, FormField, FormStack, PageToolbar } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleModal } from '@/components/shared/simple-modal';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { DataTable, Select, Textarea, humanize, toDateInput, type Column } from '@/components/shared/os-ui';

export type Row = Record<string, any> & { _id: string };

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'datetime' | 'select' | 'textarea' | 'checkbox' | 'password';
  options?: readonly (string | { value: string; label: string })[];
  required?: boolean;
  createOnly?: boolean;
  placeholder?: string;
  help?: string;
}

export interface ResourceConfig {
  title: string;
  description?: string;
  endpoint: string;
  listQuery?: string;
  columns: Column<Row>[];
  fields?: FieldDef[];
  filters?: { name: string; label: string; options: readonly string[] }[];
  searchable?: boolean;
  writePermission?: string;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  deleteLabel?: string;
  rowHref?: (row: Row) => string;
  rowActions?: (row: Row, refresh: () => void) => React.ReactNode;
  toPayload?: (form: Record<string, any>, editing: Row | null) => Record<string, any>;
  headerExtra?: React.ReactNode;
  above?: React.ReactNode;
  createLabel?: string;
  emptyText?: string;
}

function initialForm(fields: FieldDef[], row: Row | null) {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const v = row?.[f.name];
    if (f.type === 'checkbox') out[f.name] = Boolean(v);
    else if (f.type === 'date') out[f.name] = toDateInput(v);
    else if (f.type === 'datetime') out[f.name] = v ? new Date(v).toISOString().slice(0, 16) : '';
    else if (v && typeof v === 'object' && '_id' in v) out[f.name] = v._id;
    else out[f.name] = v ?? '';
  }
  return out;
}

function cleanPayload(fields: FieldDef[], form: Record<string, any>, editing: Row | null) {
  const out: Record<string, any> = {};
  for (const f of fields) {
    if (editing && f.createOnly) continue;
    const v = form[f.name];
    if (f.type === 'checkbox') out[f.name] = Boolean(v);
    else if (v === '' || v === undefined) continue;
    else if (f.type === 'number') out[f.name] = Number(v);
    else if (f.type === 'datetime' || f.type === 'date') out[f.name] = new Date(v).toISOString();
    else out[f.name] = v;
  }
  return out;
}

export function FieldInput({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-input" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  const label = <Label>{field.label}{field.required && ' *'}</Label>;
  let control: React.ReactNode;
  if (field.type === 'select') {
    control = (
      <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options?.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: humanize(o) } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </Select>
    );
  } else if (field.type === 'textarea') {
    control = <Textarea value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  } else {
    const type = field.type === 'datetime' ? 'datetime-local' : field.type || 'text';
    control = <Input type={type} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <FormField>
      {label}
      {control}
      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </FormField>
  );
}

export function ResourcePage(cfg: ResourceConfig) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const can = useCan();
  const canWrite = !cfg.writePermission || can(cfg.writePermission);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const fields = cfg.fields || [];

  const query = useMemo(() => {
    const p = new URLSearchParams(cfg.listQuery || '');
    if (search.trim()) p.set('search', search.trim());
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    if (!p.has('limit')) p.set('limit', '100');
    return `${cfg.endpoint}?${p.toString()}`;
  }, [cfg.endpoint, cfg.listQuery, search, filters]);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: [cfg.endpoint, query], queryFn: () => api.list<Row>(query) });
  const refresh = () => qc.invalidateQueries({ queryKey: [cfg.endpoint] });

  const save = useMutation({
    mutationFn: () => {
      const payload = cfg.toPayload ? cfg.toPayload(form, editing) : cleanPayload(fields, form, editing);
      return editing ? api.data(`${cfg.endpoint}/${editing._id}`, 'PATCH', payload) : api.data(cfg.endpoint, 'POST', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Saved' : 'Created');
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.data(`${cfg.endpoint}/${id}`, 'DELETE'),
    onSuccess: () => { toast.success('Removed'); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openForm = (row: Row | null) => {
    setEditing(row);
    setForm(initialForm(fields, row));
    setOpen(true);
  };

  const showActions = canWrite && (cfg.allowEdit !== false && fields.length > 0 || cfg.allowDelete || cfg.rowActions);
  const columns: Column<Row>[] = showActions
    ? [
        ...cfg.columns,
        {
          key: '__actions',
          header: '',
          className: 'w-px text-right',
          render: (row) => (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {cfg.rowActions?.(row, refresh)}
              {cfg.allowEdit !== false && fields.length > 0 && (
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => openForm(row)}><Pencil className="h-3.5 w-3.5" /></Button>
              )}
              {cfg.allowDelete && (
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-error" title={cfg.deleteLabel || 'Delete'}
                  onClick={() => window.confirm(`${cfg.deleteLabel || 'Delete'} this record?`) && remove.mutate(row._id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ),
        },
      ]
    : cfg.columns;

  const visibleFields = fields.filter((f) => !(editing && f.createOnly));

  return (
    <>
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        action={
          <>
            {cfg.headerExtra}
            {canWrite && cfg.allowCreate !== false && fields.length > 0 && (
              <Button className="w-full sm:w-auto" onClick={() => openForm(null)}>
                <Plus className="mr-2 h-4 w-4" /> {cfg.createLabel || 'New'}
              </Button>
            )}
          </>
        }
      />
      {cfg.above}
      {(cfg.searchable !== false || cfg.filters?.length) && (
        <PageToolbar>
          {cfg.searchable !== false && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
          {cfg.filters?.map((f) => (
            <Select key={f.name} className="sm:w-48" value={filters[f.name] || ''} onChange={(e) => setFilters({ ...filters, [f.name]: e.target.value })}>
              <option value="">All {f.label.toLowerCase()}</option>
              {f.options.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
            </Select>
          ))}
          {data?.pagination && <span className="text-xs text-muted-foreground sm:ml-auto">{data.pagination.total} records</span>}
        </PageToolbar>
      )}
      {isError ? <PageError onRetry={() => refetch()} /> : isLoading ? <PageLoading rows={5} /> : (
        <DataTable columns={columns} rows={data?.data || []} empty={cfg.emptyText} onRowClick={cfg.rowHref ? (r) => navigate(cfg.rowHref!(r)) : undefined} />
      )}

      <SimpleModal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${cfg.title.replace(/s$/, '')}` : cfg.createLabel || `New ${cfg.title.replace(/s$/, '')}`}>
        <FormStack>
          {visibleFields.map((f) => (
            <FieldInput key={f.name} field={f} value={form[f.name]} onChange={(v) => setForm((prev) => ({ ...prev, [f.name]: v }))} />
          ))}
          <FormActions>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </FormActions>
        </FormStack>
      </SimpleModal>
    </>
  );
}
