'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { FadeIn } from '@/components/shared/motion';
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
    <div className="flex min-h-screen items-center justify-center bg-surface-soft p-4">
      <FadeIn className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Agency ERP</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
              {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-error">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {showRegisterLink ? (
              <>Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-foreground hover:underline">Register</Link></>
            ) : (
              <>Need access? Contact your administrator for an invite.</>
            )}
          </p>
        </CardContent>
      </Card>
      </FadeIn>
    </div>
  );
}
