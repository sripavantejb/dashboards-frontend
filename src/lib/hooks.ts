import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => api.list<TeamMember>('/users?limit=200').then((r) => r.data).catch(() => [] as TeamMember[]),
    staleTime: 60_000,
  });
}

export function useProjectOptions() {
  return useQuery({
    queryKey: ['project-options'],
    queryFn: () => api.list<{ _id: string; name: string; status: string }>('/projects?limit=200').then((r) => r.data).catch(() => []),
    staleTime: 30_000,
  });
}

export const memberName = (m?: Partial<TeamMember> | null) => (m ? `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || '—' : '—');

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
