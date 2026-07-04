import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getTelHref(phone?: string): string | null {
  if (!phone?.trim()) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return null;
  return `tel:${cleaned.startsWith('+') ? cleaned : digits}`;
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  not_contacted: 'Not Contacted',
  attempt_1: 'Attempt 1',
  attempt_2: 'Attempt 2',
  connected: 'Connected',
  interested: 'Interested',
  meeting: 'Meeting',
  demo: 'Demo',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
  future_follow_up: 'Future Follow-up',
  dormant: 'Dormant',
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  not_contacted: 'bg-slate-100 text-slate-700',
  attempt_1: 'bg-yellow-100 text-yellow-700',
  attempt_2: 'bg-orange-100 text-orange-700',
  connected: 'bg-blue-100 text-blue-700',
  interested: 'bg-indigo-100 text-indigo-700',
  meeting: 'bg-purple-100 text-purple-700',
  demo: 'bg-violet-100 text-violet-700',
  proposal: 'bg-pink-100 text-pink-700',
  negotiation: 'bg-rose-100 text-rose-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  future_follow_up: 'bg-amber-100 text-amber-700',
  dormant: 'bg-gray-100 text-gray-500',
};
