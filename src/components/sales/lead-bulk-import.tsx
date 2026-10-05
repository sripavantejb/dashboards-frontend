import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { SimpleModal } from '@/components/shared/simple-modal';
import { Select } from '@/components/shared/os-ui';

type Template = {
  filename?: string;
  filenameCsv?: string;
  filenameXlsx?: string;
  csv: string;
  xlsxBase64?: string;
  formats?: string[];
  columns: Array<{ key: string; required: boolean; description: string }>;
  allowed: {
    source: string[];
    temperature: string[];
    priority: string[];
    status: string[];
  };
  tips: string[];
};

type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  totalRows: number;
  format?: string;
  errors: Array<{ row: number; message: string }>;
  leadIds: string[];
};

const ACCEPT = '.csv,.tsv,.txt,.xlsx,.xls,.xlsm,.xlsb,.ods,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const FALLBACK_CSV = [
  'contactPerson,company,phone,email,website,city,state,country,source,campaign,industry,requirement,priority,temperature,status,territory,notes,tags,nextFollowUpAt',
  'Priya Sharma,Sunrise Clinics,+919876543210,priya@sunriseclinics.in,https://sunriseclinics.in,Hyderabad,Telangana,India,website,spring_ads,Healthcare,Need Instagram + Google ads for new branch,high,hot,new,South,Asked for a callback this week,clinic;ads,2026-10-10',
  'Rahul Mehta,Orbit Retail,+918888777666,rahul@orbitretail.com,,Mumbai,Maharashtra,India,referral,,Retail,Website redesign quote,medium,warm,contacted,West,Referred by existing customer,retail,',
  'Ananya Iyer,,+917700112233,ananya.iyer@gmail.com,,Bengaluru,Karnataka,India,instagram,reel_may,,Personal brand content package,low,cold,new,,,,2026-10-12T15:30',
  '',
].join('\n');

const FALLBACK_COLUMNS: Template['columns'] = [
  { key: 'contactPerson', required: true, description: 'Full name of the contact (required)' },
  { key: 'company', required: false, description: 'Company or business name' },
  { key: 'phone', required: false, description: 'Phone with country code, e.g. +919876543210' },
  { key: 'email', required: false, description: 'Valid email address' },
  { key: 'website', required: false, description: 'Company website URL' },
  { key: 'city', required: false, description: 'City' },
  { key: 'state', required: false, description: 'State / region' },
  { key: 'country', required: false, description: 'Country' },
  { key: 'source', required: false, description: 'website | referral | instagram | facebook | linkedin | google | ads | campaign | cold_outreach | existing_customer | other' },
  { key: 'campaign', required: false, description: 'Campaign or ad name' },
  { key: 'industry', required: false, description: 'Industry vertical' },
  { key: 'requirement', required: false, description: 'What they need' },
  { key: 'priority', required: false, description: 'urgent | high | medium | low' },
  { key: 'temperature', required: false, description: 'hot | warm | cold' },
  { key: 'status', required: false, description: 'new | contacted | qualified | unqualified | converted | lost' },
  { key: 'territory', required: false, description: 'Territory or zone' },
  { key: 'notes', required: false, description: 'Free-text notes' },
  { key: 'tags', required: false, description: 'Semicolon-separated tags, e.g. vip;q1' },
  { key: 'nextFollowUpAt', required: false, description: 'Callback date YYYY-MM-DD or YYYY-MM-DDTHH:mm' },
];

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, text: string, mime: string) {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

function downloadBase64(filename: string, base64: string, mime: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  downloadBlob(filename, new Blob([bytes], { type: mime }));
}

export function LeadBulkImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [result, setResult] = useState<ImportResult | null>(null);

  const templateQ = useQuery({
    queryKey: ['sales', '/leads/import/template'],
    queryFn: () => api.data<Template>('/sales-crm/leads/import/template'),
    enabled: open,
    staleTime: 60_000,
    retry: 1,
  });

  const template = templateQ.data;
  const columns = template?.columns?.length ? template.columns : FALLBACK_COLUMNS;
  const tips = template?.tips?.length
    ? template.tips
    : [
      'Download sample CSV or Excel, fill rows, then upload.',
      'Supports .xlsx, .xls, .csv, .tsv, .txt and other spreadsheet formats.',
      'contactPerson is required on every row.',
    ];

  useEffect(() => {
    if (!open) {
      setFile(null);
      setResult(null);
      setDuplicateStrategy('skip');
    }
  }, [open]);

  const fileLabel = useMemo(() => {
    if (!file) return '';
    const kb = Math.max(1, Math.round(file.size / 1024));
    return `${file.name} · ${kb} KB`;
  }, [file]);

  const importMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a spreadsheet file first');
      const form = new FormData();
      form.append('file', file);
      form.append('duplicateStrategy', duplicateStrategy);
      const res = await api.upload<ImportResult>('/sales-crm/leads/import/upload', form);
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Import failed');
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      const parts = [
        data.imported ? `${data.imported} imported` : null,
        data.updated ? `${data.updated} updated` : null,
        data.skipped ? `${data.skipped} skipped` : null,
        data.failed ? `${data.failed} failed` : null,
      ].filter(Boolean);
      toast.success(parts.length ? parts.join(' · ') : 'Import finished');
      if (data.imported + data.updated > 0) onImported();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = (next: File | null) => {
    if (!next) return;
    const ok = /\.(csv|tsv|txt|xlsx|xls|xlsm|xlsb|ods)$/i.test(next.name)
      || /sheet|excel|csv|text/.test(next.type);
    if (!ok) {
      toast.error('Use .xlsx, .xls, .csv, .tsv, or .txt');
      return;
    }
    setFile(next);
    setResult(null);
  };

  const downloadSampleCsv = () => {
    const csv = template?.csv || FALLBACK_CSV;
    const name = template?.filenameCsv || template?.filename || 'bda-leads-import-sample.csv';
    downloadText(name, csv, 'text/csv;charset=utf-8');
    toast.success('Sample CSV downloaded');
  };

  const downloadSampleXlsx = async () => {
    try {
      if (template?.xlsxBase64) {
        downloadBase64(
          template.filenameXlsx || 'bda-leads-import-sample.xlsx',
          template.xlsxBase64,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        toast.success('Sample Excel downloaded');
        return;
      }
      await api.download('/sales-crm/leads/import/template.xlsx', 'bda-leads-import-sample.xlsx');
      toast.success('Sample Excel downloaded');
    } catch {
      // Last resort: offer CSV so the user is never stuck.
      downloadSampleCsv();
      toast.message('Excel sample unavailable — downloaded CSV instead');
    }
  };

  return (
    <SimpleModal open={open} onClose={onClose} title="Bulk import leads" className="max-w-2xl">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Download a sample sheet (CSV or Excel), fill your leads with the same column headers, then upload.
          Supports <span className="font-medium text-foreground">.xlsx, .xls, .csv, .tsv, .txt</span> and other spreadsheet formats.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-9" onClick={downloadSampleCsv}>
            <Download className="mr-2 h-4 w-4" />
            Sample CSV
          </Button>
          <Button type="button" variant="outline" className="h-9" onClick={() => void downloadSampleXlsx()}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Sample Excel (.xlsx)
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-black/[0.06]">
          <div className="border-b border-black/[0.05] bg-surface-soft/50 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Sheet columns
          </div>
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <tbody>
                {columns.map((col) => (
                  <tr key={col.key} className="border-b border-black/[0.04] last:border-0">
                    <td className="whitespace-nowrap px-3 py-1.5 font-medium">
                      {col.key}
                      {col.required && <span className="ml-1 text-error">*</span>}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{col.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>

        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/10 bg-surface-soft/30 px-4 py-8 text-center transition-colors hover:border-black/20 hover:bg-surface-soft/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0] || null);
          }}
        >
          <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">{fileLabel || 'Drop spreadsheet here or click to upload'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {file ? 'Ready to import' : 'xlsx · xls · csv · tsv · txt · up to 500 rows'}
          </p>
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0] || null);
              e.target.value = '';
            }}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">If phone/email already exists</span>
            <Select
              className="h-9 w-full py-0 pl-2.5 pr-8 text-[13px] leading-9"
              value={duplicateStrategy}
              onChange={(e) => setDuplicateStrategy(e.target.value as 'skip' | 'update')}
            >
              <option value="skip">Skip duplicate rows</option>
              <option value="update">Update existing lead</option>
            </Select>
          </label>
          <div className="flex items-end">
            <p className="text-xs text-muted-foreground">
              <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" />
              Matching uses email or phone within your organization.
            </p>
          </div>
        </div>

        {result && (
          <div className="rounded-lg border border-black/[0.06] bg-surface-soft/40 px-3 py-3 text-sm">
            <p className="font-medium">
              {result.imported} imported · {result.updated} updated · {result.skipped} skipped · {result.failed} failed
              <span className="font-normal text-muted-foreground">
                {' '}({result.totalRows} rows{result.format ? ` · ${result.format}` : ''})
              </span>
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-error">
                {result.errors.map((err) => (
                  <li key={`${err.row}-${err.message}`}>Row {err.row}: {err.message.replace(/^Row \d+:\s*/, '')}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-black/[0.05] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button
            type="button"
            disabled={!file || importMut.isPending}
            onClick={() => importMut.mutate()}
          >
            {importMut.isPending ? 'Importing…' : 'Import leads'}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}
