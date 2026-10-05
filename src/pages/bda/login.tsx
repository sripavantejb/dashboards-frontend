import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate, useParams } from 'react-router';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { PageError, PageLoading } from '@/components/shared/page-states';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Organization, User } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

type BdaBrand = { name: string; slug: string; logo: string };

export default function BdaLoginPage() {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, organization, hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const brand = useQuery({
    queryKey: ['bda-brand', orgSlug],
    queryFn: () => api.data<BdaBrand>(`/auth/bda/${orgSlug}`),
    enabled: Boolean(orgSlug),
    retry: false,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (hasHydrated && isAuthenticated && organization?.slug) {
    return <Navigate to={`/${organization.slug}/bda`} replace />;
  }

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await api.post<{
        user: User;
        organization: Organization;
        accessToken: string;
        refreshToken: string;
      }>(`/auth/bda/${orgSlug}/login`, data);

      if (response.success && response.data) {
        setAuth(
          response.data.user,
          response.data.organization,
          response.data.accessToken,
          response.data.refreshToken
        );
        toast.success(`Welcome to ${response.data.organization.name}`);
        navigate(`/${response.data.organization.slug}/bda`);
      } else {
        toast.error(response.error?.message || 'Login failed');
      }
    } catch {
      toast.error('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (brand.isLoading) return <PageLoading />;
  if (brand.isError || !brand.data) {
    const msg = (brand.error as Error | undefined)?.message || '';
    const isDb = /database|unavailable|connect/i.test(msg);
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <PageError
          message={isDb
            ? 'The BDA portal is temporarily unavailable. Please try again in a moment.'
            : 'This company BDA portal was not found or is inactive.'}
          onRetry={() => brand.refetch()}
        />
      </div>
    );
  }

  const company = brand.data;

  return (
    <AuthSplitLayout
      companyName={company.name}
      companyLogo={company.logo}
      badge="BDA Portal"
      headline={`Sell with ${company.name}. Your leads, calls, and follow-ups in one place.`}
      steps={[
        { number: 1, label: 'Enter your BDA email and password' },
        { number: 2, label: 'Open your company sales workspace' },
      ]}
      formTitle="BDA sign in"
      formDescription={`Use the credentials your ${company.name} admin shared with you.`}
      emailPlaceholder="you@company.com"
      submitLabel="Sign in to BDA"
      loading={loading}
      onSubmit={handleSubmit(onSubmit)}
      emailRegister={register('email')}
      passwordRegister={register('password')}
      emailError={errors.email?.message}
      passwordError={errors.password?.message}
      footer="Agency staff should use the company login instead."
    />
  );
}
