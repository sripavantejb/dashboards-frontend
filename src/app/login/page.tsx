'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User, Organization } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@agency.com', password: 'Admin@123456' },
  });

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.get<{ allowPublicRegistration: boolean; inviteOnlyMode: boolean }>('/auth/settings/public'),
  });

  const showRegisterLink = publicSettings?.data?.allowPublicRegistration || !publicSettings?.data?.inviteOnlyMode;

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await api.post<{
        user: User;
        organization: Organization;
        accessToken: string;
      }>('/auth/login', data);

      if (response.success && response.data) {
        setAuth(response.data.user, response.data.organization, response.data.accessToken);
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        toast.error(response.error?.message || 'Login failed');
      }
    } catch {
      toast.error('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge="Agency Login"
      headline="Run your agency. Manage leads, pipeline, and teams with clarity."
      steps={[
        { number: 1, label: 'Enter your email and password' },
        { number: 2, label: 'Access your agency dashboard' },
      ]}
      formTitle="Your workspace starts here"
      formDescription="Use your company email and password to sign in."
      emailPlaceholder="you@company.com"
      submitLabel="Sign in"
      loading={loading}
      onSubmit={handleSubmit(onSubmit)}
      emailRegister={register('email')}
      passwordRegister={register('password')}
      emailError={errors.email?.message}
      passwordError={errors.password?.message}
      footer={
        showRegisterLink ? (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-foreground hover:underline">
              Register
            </Link>
          </>
        ) : (
          <>
            Need access?{' '}
            <Link href="/#request-access" className="font-medium text-foreground hover:underline">
              Request access
            </Link>
          </>
        )
      }
    />
  );
}
