'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield } from 'lucide-react';
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

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'superadmin@agencyerp.com', password: 'SuperAdmin@123456' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await api.post<{
        user: User;
        organization: Organization;
        accessToken: string;
      }>('/auth/admin/login', data);

      if (response.success && response.data) {
        setAuth(response.data.user, response.data.organization, response.data.accessToken);
        toast.success('Welcome, Platform Admin');
        router.push('/admin');
      } else {
        toast.error(response.error?.message || 'Login failed');
      }
    } catch {
      toast.error('Invalid super admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft p-4">
      <FadeIn className="w-full max-w-md">
        <Card className="w-full border-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-2xl">Platform Admin</CardTitle>
            <CardDescription>
              Super admin portal — manage all companies, plans, and login credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Super Admin Email</Label>
                <Input id="email" type="email" placeholder="superadmin@agencyerp.com" {...register('email')} />
                {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
                {errors.password && <p className="text-xs text-error">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in to Admin Panel'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Company user?{' '}
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Sign in to ERP
              </Link>
            </p>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
