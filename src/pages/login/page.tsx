import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User, Organization } from '@/types';
import { useNavigate } from 'react-router';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await api.post<{
        user: User;
        organization: Organization;
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', data);

      if (response.success && response.data) {
        setAuth(
          response.data.user,
          response.data.organization,
          response.data.accessToken,
          response.data.refreshToken
        );
        toast.success('Welcome back!');
        navigate('/dashboard');
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
      footer="Don't have an account? Contact admin."
    />
  );
}
