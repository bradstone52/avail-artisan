import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';

export default function Brokerages() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Building className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Brokerages</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Brokerage Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Brokerage management coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
