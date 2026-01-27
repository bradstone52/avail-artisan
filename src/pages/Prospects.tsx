import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserSearch } from 'lucide-react';

export default function Prospects() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <UserSearch className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Prospects</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Prospect Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Lead and prospect management coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
