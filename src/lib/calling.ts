export const CALL_OUTCOMES = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'follow_up', label: 'Follow-up Required' },
  { value: 'callback', label: 'Callback Requested' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'other', label: 'Other' },
] as const;

const LEGACY_LABELS: Record<string, string> = { connected: 'Connected', qualified: 'Qualified' };

export function callOutcomeLabel(value?: string | null) {
  if (!value) return '';
  return CALL_OUTCOMES.find((item) => item.value === value)?.label || LEGACY_LABELS[value] || value.replace(/_/g, ' ');
}

export function formatCallDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes === 0) return `${rest}s`;
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`;
}

export function formatStoredDuration(row?: { durationSeconds?: number | null; durationMinutes?: number } | null) {
  if (!row) return null;
  if (typeof row.durationSeconds === 'number' && row.durationSeconds >= 0) return formatCallDuration(row.durationSeconds);
  if (row.durationMinutes) return `${row.durationMinutes} min`;
  return null;
}

export function durationCaption(source?: string | null) {
  if (source === 'phone_return') return 'Timed from when the dialer opened until you came back. The phone network does not send this to the CRM.';
  if (source === 'crm_timer') return 'Timed in the CRM until you marked the call complete. The phone network does not send this.';
  return 'Length is not available. The browser cannot read call duration from your phone.';
}

/** True when this browser can open the device dialer. A desktop tel: link only works if the OS hands it to a linked phone. */
export function isHandset() {
  if (typeof navigator === 'undefined') return false;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) return true;
  return window.matchMedia?.('(pointer: coarse)').matches === true && window.innerWidth < 900;
}

export function openTel(telUri: string) {
  const link = document.createElement('a');
  link.href = telUri;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export type DirectDial = 'clicked' | 'opened' | 'unavailable';

/** On this Windows laptop, ask the local helper to open Phone Link and press Call. */
export async function dialThroughBridge(telUri: string): Promise<DirectDial> {
  if (typeof window === 'undefined' || laptopOs() !== 'windows') return 'unavailable';
  if (!/^tel:\+[0-9]{8,15}$/.test(telUri)) return 'unavailable';
  try {
    const res = await fetch('http://127.0.0.1:47821/dial', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: telUri,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return 'unavailable';
    const data = (await res.json()) as { clicked?: boolean; opened?: boolean };
    if (data.clicked) return 'clicked';
    if (data.opened) return 'opened';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

const OS_LINK_KEY = 'crm-os-phone-linked';
const TEL_ALWAYS_KEY = 'crm-tel-always';

export function osPhoneLinked() {
  return localStorage.getItem(OS_LINK_KEY) === '1';
}

export function markOsPhoneLinked() {
  localStorage.setItem(OS_LINK_KEY, '1');
}

export function telAlwaysDone() {
  return localStorage.getItem(TEL_ALWAYS_KEY) === '1';
}

export function markTelAlwaysDone() {
  localStorage.setItem(TEL_ALWAYS_KEY, '1');
}

export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function laptopOs(): 'windows' | 'mac' | 'other' {
  const ua = navigator.userAgent || '';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
  return 'other';
}
