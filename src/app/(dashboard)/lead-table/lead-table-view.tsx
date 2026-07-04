'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, createColumnHelper, type SortingState,
} from '@tanstack/react-table';
import { Save, Download, CheckSquare, Square, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { PageToolbar } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/utils';
import type { Lead, SavedView } from '@/types';

const columnHelper = createColumnHelper<Lead>();

export default function LeadTablePage() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leads-table'],
    queryFn: () => api.get<Lead[]>('/leads?limit=100'),
  });

  const { data: viewsData } = useQuery({
    queryKey: ['saved-views'],
    queryFn: () => api.get<SavedView[]>('/saved-views'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      api.patch(`/leads/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-table'] });
      setEditingCell(null);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      api.patch('/leads/bulk', { leadIds: Array.from(selectedIds), updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-table'] });
      queryClient.invalidateQueries({ queryKey: ['leads-for-calling'] });
      setSelectedIds(new Set());
      toast.success('Bulk update applied');
    },
  });

  const saveViewMutation = useMutation({
    mutationFn: (name: string) => api.post('/saved-views', {
      name,
      filters: { search: globalFilter },
      columns: ['firstName', 'lastName', 'email', 'phone', 'company', 'status', 'score', 'source'],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views'] });
      toast.success('View saved');
    },
  });

  const deleteViewMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/saved-views/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views'] });
      toast.success('View deleted');
    },
  });

  const leads = data?.data || [];
  const savedViews = viewsData?.data || [];

  const startEdit = useCallback((id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingCell) return;
    updateMutation.mutate({ id: editingCell.id, updates: { [editingCell.field]: editValue } });
  }, [editingCell, editValue, updateMutation]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(leads.map((l) => l._id)));
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: () => (
        <button onClick={toggleAll}>
          {selectedIds.size === leads.length && leads.length > 0
            ? <CheckSquare className="h-4 w-4" />
            : <Square className="h-4 w-4" />}
        </button>
      ),
      cell: ({ row }) => (
        <button onClick={() => toggleSelect(row.original._id)}>
          {selectedIds.has(row.original._id)
            ? <CheckSquare className="h-4 w-4" />
            : <Square className="h-4 w-4" />}
        </button>
      ),
      size: 40,
    }),
    columnHelper.accessor('firstName', {
      header: 'First Name',
      cell: ({ row, getValue }) => {
        const isEditing = editingCell?.id === row.original._id && editingCell.field === 'firstName';
        return isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
            className="h-7 text-sm"
            autoFocus
          />
        ) : (
          <span className="cursor-pointer hover:underline" onClick={() => startEdit(row.original._id, 'firstName', getValue())}>
            {getValue()}
          </span>
        );
      },
    }),
    columnHelper.accessor('lastName', {
      header: 'Last Name',
      cell: ({ row, getValue }) => {
        const isEditing = editingCell?.id === row.original._id && editingCell.field === 'lastName';
        return isEditing ? (
          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} className="h-7 text-sm" autoFocus />
        ) : (
          <span className="cursor-pointer hover:underline" onClick={() => startEdit(row.original._id, 'lastName', getValue() || '')}>{getValue() || '—'}</span>
        );
      },
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: ({ row, getValue }) => {
        const isEditing = editingCell?.id === row.original._id && editingCell.field === 'email';
        return isEditing ? (
          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} className="h-7 text-sm" autoFocus />
        ) : (
          <span className="cursor-pointer hover:underline" onClick={() => startEdit(row.original._id, 'email', getValue() || '')}>{getValue() || '—'}</span>
        );
      },
    }),
    columnHelper.accessor('phone', { header: 'Phone' }),
    columnHelper.accessor('company', { header: 'Company' }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_COLORS[getValue()] || ''}`}>
          {LEAD_STATUS_LABELS[getValue()] || getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('score', { header: 'Score' }),
    columnHelper.accessor('source', { header: 'Source', cell: ({ getValue }) => <Badge variant="outline">{getValue() || '—'}</Badge> }),
  ], [editingCell, editValue, selectedIds, leads.length, saveEdit, startEdit]);

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const exportCSV = () => {
    const headers = ['firstName', 'lastName', 'email', 'phone', 'company', 'status', 'score', 'source'];
    const csv = [
      headers.join(','),
      ...leads.map((l) => headers.map((h) => `"${String((l as unknown as Record<string, unknown>)[h] ?? '')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-export.csv';
    a.click();
  };

  return (
    <>
      <PageHeader
        title="Lead Table"
        description="Excel-like editable table with inline editing and bulk actions"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => {
              const name = prompt('View name');
              if (name) saveViewMutation.mutate(name);
            }}><Save className="h-4 w-4 mr-1" /> Save View</Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
          </div>
        }
      />

      <PageToolbar>
        <Input
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        {savedViews.map((view) => (
          <Badge
            key={view._id}
            variant="outline"
            className="cursor-pointer hover:bg-surface-soft"
            onClick={() => setGlobalFilter((view.filters.search as string) || '')}
          >
            {view.name}
            <button className="ml-1 text-muted-foreground hover:text-error" onClick={(e) => { e.stopPropagation(); deleteViewMutation.mutate(view._id); }}>×</button>
          </Badge>
        ))}
        {selectedIds.size > 0 && (
          <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">Bulk status...</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <Button size="sm" disabled={!bulkStatus} onClick={() => bulkMutation.mutate({ status: bulkStatus })}>
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkMutation.mutate({ inCallingQueue: true })}
            >
              <Phone className="h-3 w-3 mr-1" /> Add to Calling Queue
            </Button>
          </div>
        )}
      </PageToolbar>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b bg-surface-soft">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-3 text-left font-medium text-muted-foreground cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={columns.length} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="p-8 text-center text-muted-foreground">No leads</td></tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-surface-soft/50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
