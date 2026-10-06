import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Organization } from '@/types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (
    user: User,
    organization: Organization | null,
    accessToken: string,
    refreshToken?: string
  ) => void;
  logout: () => void;
  updateOrganization: (patch: Partial<Organization>) => void;
  updateUser: (patch: Partial<User>) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, organization, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, organization, isAuthenticated: true });
      },
      updateOrganization: (patch) => set((s) => (s.organization ? { organization: { ...s.organization, ...patch } } : {})),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, organization: null, isAuthenticated: false });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const access = localStorage.getItem('accessToken');
          const refresh = localStorage.getItem('refreshToken');
          // Keep the session if either token is still around so a missing access token
          // can be refreshed instead of kicking the user to login.
          if (state.isAuthenticated && !access && !refresh) {
            state.logout();
          }
        }
        useAuthStore.getState().setHasHydrated(true);
      },
    }
  )
);

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
