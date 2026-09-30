import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="font-display text-xl font-semibold">Coming in Phase 2</h2>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
            This module is on the development roadmap and will be available in the next release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
