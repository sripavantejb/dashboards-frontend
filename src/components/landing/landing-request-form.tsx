import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollSection, ScrollReveal } from './landing-motion';
import { api } from '@/lib/api';

const requestSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  companyName: z.string().min(2, 'Company name is required'),
  phone: z.string().optional(),
  teamSize: z.string().optional(),
  message: z.string().max(2000).optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

export function LandingRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
  });

  const onSubmit = async (data: RequestForm) => {
    setLoading(true);
    try {
      const response = await api.post('/access-requests', data);
      if (response.success) {
        setSubmitted(true);
        reset();
        toast.success('Request submitted! Our team will contact you shortly.');
      } else {
        toast.error(response.error?.message || 'Failed to submit request');
      }
    } catch {
      toast.error('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="request-access">
    <ScrollSection className="mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Get Access</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Request a demo or platform access
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Agency ERP is available by request. Fill in your details and our team will reach out
          to schedule a walkthrough and set up your agency workspace.
        </p>
      </div>

      <ScrollReveal direction="scale" className="mx-auto mt-12 max-w-2xl">
        {submitted ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="mb-4 h-12 w-12 text-success" />
              <h3 className="font-display text-xl font-semibold">Request received</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Thank you for your interest in Agency ERP. Our team will review your request
                and contact you within 1–2 business days.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>
                Submit another request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Access request form</CardTitle>
              <CardDescription>
                Tell us about your agency. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input id="firstName" placeholder="John" {...register('firstName')} />
                    {errors.firstName && <p className="text-xs text-error">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input id="lastName" placeholder="Smith" {...register('lastName')} />
                    {errors.lastName && <p className="text-xs text-error">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Work email *</Label>
                  <Input id="email" type="email" placeholder="you@agency.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Agency / company name *</Label>
                  <Input id="companyName" placeholder="Acme Marketing Agency" {...register('companyName')} />
                  {errors.companyName && <p className="text-xs text-error">{errors.companyName.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" placeholder="+91 98765 43210" {...register('phone')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Team size</Label>
                    <Input id="teamSize" placeholder="e.g. 5–20 people" {...register('teamSize')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">What are you looking to solve?</Label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Tell us about your agency, current tools, and what you need from Agency ERP..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register('message')}
                  />
                  {errors.message && <p className="text-xs text-error">{errors.message.message}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Submitting...' : (
                    <>
                      Submit access request
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <a href="/login" className="font-medium text-foreground hover:underline">Sign in</a>
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </ScrollReveal>
    </ScrollSection>
    </section>
  );
}
