import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { SimpleModal } from '@/components/shared/simple-modal';
import { Select } from '@/components/shared/os-ui';

type Template = {
  filename: string;
  csv: string;
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
  errors: Array<{ row: number; message: string }>;
  leadIds: string[];
};

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [result, setResult] = useState<ImportResult | null>(null);

  const templateQ = useQuery({
    queryKey: ['sales', '/leads/import/template'],
    queryFn: () => api.data<Template>('/sales-crm/leads/import/template'),
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) {
      setCsvText('');
      setFileName('');
      setResult(null);
      setDuplicateStrategy('skip');
    }
  }, [open]);

  const previewRows = useMemo(() => {
    if (!csvText.trim()) return 0;
    return Math.max(0, csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim()).length - 1);
  }, [csvText]);

  const importMut = useMutation({
    mutationFn: () => api.data<ImportResult>('/sales-crm/leads/import', 'POST', { csv: csvText, duplicateStrategy }),
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

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      toast.error('Please upload a .csv file');
      return;
    }
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    setResult(null);
  };

  return (
    <SimpleModal open={open} onClose={onClose} title="Bulk import leads" className="max-w-2xl">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Download the sample sheet, fill your leads using the same column headers, then upload the CSV.
          Imported leads appear in this list with status, temperature, notes, and callbacks wired like manually created leads.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9"
            disabled={!templateQ.data}
            onClick={() => {
              const t = templateQ.data;
              if (!t) return;
              downloadCsv(t.filename, t.csv);
              toast.success('Sample sheet downloaded');
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download sample CSV
          </Button>
        </div>

        {templateQ.data && (
          <div className="overflow-hidden rounded-lg border border-black/[0.06]">
            <div className="border-b border-black/[0.05] bg-surface-soft/50 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              CSV columns
            </div>
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <tbody>
                  {templateQ.data.columns.map((col) => (
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
        )}

        {templateQ.data?.tips?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {templateQ.data.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/10 bg-surface-soft/30 px-4 py-8 text-center transition-colors hover:border-black/20 hover:bg-surface-soft/50">
          <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">{fileName || 'Drop CSV here or click to upload'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {previewRows > 0 ? `${previewRows} data row${previewRows === 1 ? '' : 's'} ready` : 'Accepts .csv up to 500 rows'}
          </p>
          <input
            type="file"
            accept=".csv,text/csv,.txt"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0] || null)}
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
              <span className="font-normal text-muted-foreground"> ({result.totalRows} rows)</span>
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
            disabled={!csvText.trim() || importMut.isPending}
            onClick={() => importMut.mutate()}
          >
            {importMut.isPending ? 'Importing…' : 'Import leads'}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}
