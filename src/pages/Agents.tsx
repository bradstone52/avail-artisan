import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRound } from 'lucide-react';

export default function Agents() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <UserRound className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Agents</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Agent Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Agent contact management coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
