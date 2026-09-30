import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, Type, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { LeadCategory, LeadImportJob } from '@/types';

type Step = 'upload' | 'mapping' | 'preview' | 'result';

const TARGET_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company', 'title', 'city', 'source', 'notes'];

export default function ImportPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('upload');
  const [categoryId, setCategoryId] = useState('');
  const [importJob, setImportJob] = useState<LeadImportJob | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');
  const [bulkText, setBulkText] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'bulk' | 'manual'>('file');
  const [manualLead, setManualLead] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '' });

  const { data: categoriesData } = useQuery({
    queryKey: ['lead-categories'],
    queryFn: () => api.get<LeadCategory[]>('/lead-categories'),
  });

  const { data: historyData } = useQuery({
    queryKey: ['imports'],
    queryFn: () => api.get<LeadImportJob[]>('/imports'),
  });

  const categories = categoriesData?.data || [];
  const history = historyData?.data || [];

  const executeMutation = useMutation({
    mutationFn: (id: string) => api.post<LeadImportJob>(`/imports/${id}/execute`),
    onSuccess: (res) => {
      if (res.data) {
        setImportJob(res.data);
        setStep('result');
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['imports'] });
        toast.success(`Imported ${res.data.importedCount} leads`);
      }
    },
    onError: () => toast.error('Import failed'),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !categoryId) {
      toast.error('Select a category first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoryId', categoryId);

    const res = await api.upload<{
      importJob: LeadImportJob;
      headers: string[];
      sampleRows: Record<string, string>[];
      totalRows: number;
    }>('/imports/upload', formData);

    if (res.success && res.data) {
      setImportJob(res.data.importJob);
      setHeaders(res.data.headers);
      setFieldMapping(res.data.importJob.fieldMapping || {});
      setStep('mapping');
      toast.success(`Parsed ${res.data.totalRows} rows`);
    } else {
      toast.error(res.error?.message || 'Upload failed');
    }
  };

  const handleBulkText = async () => {
    if (!categoryId || !bulkText.trim()) return;
    const res = await api.post<LeadImportJob>('/imports/bulk-text', { categoryId, text: bulkText });
    if (res.success && res.data) {
      setImportJob(res.data);
      setStep('preview');
      toast.success('Bulk text parsed');
    }
  };

  const handleMappingSave = async () => {
    if (!importJob) return;
    await api.patch(`/imports/${importJob._id}/mapping`, { fieldMapping, duplicateStrategy });
    setStep('preview');
  };

  const handleExecute = () => {
    if (importJob) executeMutation.mutate(importJob._id);
  };

  const handleManualImport = async () => {
    if (!categoryId || !manualLead.firstName.trim()) return;
    const res = await api.post<LeadImportJob>('/imports/manual', { categoryId, leads: [manualLead] });
    if (res.success && res.data) {
      const mapping = { firstName: 'firstName', lastName: 'lastName', email: 'email', phone: 'phone', company: 'company' };
      await api.patch(`/imports/${res.data._id}/mapping`, { fieldMapping: mapping, duplicateStrategy: 'skip' });
      executeMutation.mutate(res.data._id);
      setManualLead({ firstName: '', lastName: '', email: '', phone: '', company: '' });
    }
  };

  const reset = () => {
    setStep('upload');
    setImportJob(null);
    setHeaders([]);
    setFieldMapping({});
    setBulkText('');
  };

  return (
    <>
      <PageHeader title="Lead Import Center" description="Import leads from CSV, Excel, or bulk text" />

      <div className="flex flex-wrap items-center gap-2">
        {(['upload', 'mapping', 'preview', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <Badge variant={step === s ? 'default' : 'outline'} className="capitalize">{s}</Badge>
            {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Lead Category</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button variant={importMode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setImportMode('file')}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> File
                </Button>
                <Button variant={importMode === 'bulk' ? 'default' : 'outline'} size="sm" onClick={() => setImportMode('bulk')}>
                  <Type className="h-4 w-4 mr-1" /> Bulk Text
                </Button>
                <Button variant={importMode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setImportMode('manual')}>
                  Manual
                </Button>
              </div>

              {importMode === 'file' ? (
                <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:bg-surface-soft transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drop CSV file or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports CSV up to 50MB</p>
                  <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : importMode === 'bulk' ? (
                <div className="space-y-3">
                  <textarea
                    className="w-full h-40 rounded-md border border-input bg-background p-3 text-sm"
                    placeholder={"Name: John Doe\nEmail: john@example.com\nPhone: +91 98765 43210\nCompany: Acme Corp\n\n---\n\nName: Jane Smith\n..."}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <Button onClick={handleBulkText} disabled={!categoryId || !bulkText.trim()}>Parse Bulk Text</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input placeholder="First Name *" value={manualLead.firstName} onChange={(e) => setManualLead({ ...manualLead, firstName: e.target.value })} />
                  <Input placeholder="Last Name" value={manualLead.lastName} onChange={(e) => setManualLead({ ...manualLead, lastName: e.target.value })} />
                  <Input placeholder="Email" value={manualLead.email} onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })} />
                  <Input placeholder="Phone" value={manualLead.phone} onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })} />
                  <Input placeholder="Company" value={manualLead.company} onChange={(e) => setManualLead({ ...manualLead, company: e.target.value })} />
                  <Button onClick={handleManualImport} disabled={!categoryId || !manualLead.firstName.trim()}>Import Lead</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Import History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No imports yet</p>
              ) : (
                history.slice(0, 5).map((job) => (
                  <div key={job._id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{job.fileName || job.source}</p>
                      <p className="text-xs text-muted-foreground">{job.importedCount}/{job.totalRows} imported</p>
                    </div>
                    <Badge variant={job.status === 'completed' ? 'success' : 'outline'}>{job.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-32 truncate">{header}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <select
                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={fieldMapping[header] || ''}
                    onChange={(e) => setFieldMapping({ ...fieldMapping, [header]: e.target.value })}
                  >
                    <option value="">Skip</option>
                    {TARGET_FIELDS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Duplicate Strategy</Label>
              <select
                className="w-full max-w-xs h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value)}
              >
                <option value="skip">Skip duplicates</option>
                <option value="merge">Merge with existing</option>
                <option value="import_all">Import all (allow duplicates)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={handleMappingSave}>Preview Import</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && importJob && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview — {importJob.totalRows} rows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.values(fieldMapping).filter(Boolean).map((f) => (
                      <th key={f} className="p-2 text-left font-medium">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(importJob.preview || []).slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b">
                      {Object.entries(fieldMapping).filter(([, v]) => v).map(([src]) => (
                        <td key={src} className="p-2">{(row as Record<string, string>)[src] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={handleExecute} disabled={executeMutation.isPending}>
                {executeMutation.isPending ? 'Importing...' : `Import ${importJob.totalRows} Leads`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'result' && importJob && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-12 w-12 text-success mb-4" />
            <h2 className="font-display text-xl font-semibold">Import Complete</h2>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div><p className="text-2xl font-semibold">{importJob.importedCount}</p><p className="text-xs text-muted-foreground">Imported</p></div>
              <div><p className="text-2xl font-semibold">{importJob.skippedCount}</p><p className="text-xs text-muted-foreground">Skipped</p></div>
              <div><p className="text-2xl font-semibold">{importJob.duplicateCount}</p><p className="text-xs text-muted-foreground">Duplicates</p></div>
              <div><p className="text-2xl font-semibold">{importJob.errorCount}</p><p className="text-xs text-muted-foreground">Errors</p></div>
            </div>
            <Button className="mt-6" onClick={reset}>Import More</Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
