'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
    <AuthSplitLayout
      badge="Admin Login"
      headline="Manage your platform. Guide agencies and teams with clarity."
      steps={[
        { number: 1, label: 'Enter your admin email and password' },
        { number: 2, label: 'Access the Admin Dashboard' },
      ]}
      formTitle="Admin access starts here"
      formDescription="Use your super admin email and password."
      emailLabel="Admin email"
      emailPlaceholder="superadmin@agencyerp.com"
      submitLabel="Sign in"
      loading={loading}
      onSubmit={handleSubmit(onSubmit)}
      emailRegister={register('email')}
      passwordRegister={register('password')}
      emailError={errors.email?.message}
      passwordError={errors.password?.message}
      footer={
        <>
          Company user?{' '}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in to ERP
          </Link>
        </>
      }
    />
  );
}
