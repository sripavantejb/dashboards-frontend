'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { FadeIn } from '@/components/shared/motion';
import { PageLoading } from '@/components/shared/page-states';
import type { User, Organization } from '@/types';

const registerSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.get<{ allowPublicRegistration: boolean; inviteOnlyMode: boolean }>('/auth/settings/public'),
  });

  const { data: inviteData, isLoading: inviteLoading } = useQuery({
    queryKey: ['invite', inviteToken],
    queryFn: () => api.get<{ email?: string; organizationName?: string; plan: string }>(`/auth/invite/${inviteToken}`),
    enabled: !!inviteToken,
  });

  const settings = publicSettings?.data;
  const invite = inviteData?.data;
  const registrationBlocked = !inviteToken && settings?.inviteOnlyMode && !settings?.allowPublicRegistration;

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    values: {
      organizationName: invite?.organizationName || '',
      firstName: '',
      lastName: '',
      email: invite?.email || '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const response = await api.post<{
        user: User;
        organization: Organization;
        accessToken: string;
        refreshToken: string;
      }>('/auth/register', { ...data, inviteToken: inviteToken || undefined });

      if (response.success && response.data) {
        setAuth(
          response.data.user,
          response.data.organization,
          response.data.accessToken,
          response.data.refreshToken
        );
        toast.success('Account created successfully!');
        router.push('/dashboard');
      } else {
        toast.error(response.error?.message || 'Registration failed');
      }
    } catch {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (inviteToken && inviteLoading) return <PageLoading rows={3} />;

  if (registrationBlocked) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Invite Required</CardTitle>
          <CardDescription>Registration is invite-only. Contact your administrator for an invite link.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/login"><Button variant="outline">Back to Sign In</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">Create Account</CardTitle>
        <CardDescription>
          {invite ? (
            <span className="flex items-center justify-center gap-2 flex-wrap">
              Invited to join Agency ERP
              <Badge variant="outline" className="capitalize">{invite.plan} plan</Badge>
            </span>
          ) : (
            'Start your agency ERP journey'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input placeholder="Your Agency Name" {...register('organizationName')} readOnly={!!invite?.organizationName} />
            {errors.organizationName && <p className="text-xs text-error">{errors.organizationName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input {...register('firstName')} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input {...register('lastName')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register('email')} readOnly={!!invite?.email} />
            {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-error">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft p-4">
      <FadeIn className="w-full max-w-md">
        <Suspense fallback={<PageLoading rows={3} />}>
          <RegisterFormContent />
        </Suspense>
      </FadeIn>
    </div>
  );
}
