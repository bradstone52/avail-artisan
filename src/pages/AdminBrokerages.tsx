import { AppLayout } from '@/components/layout/AppLayout';
import { BrokeragesAndAgentsTab } from '@/components/settings/BrokeragesAndAgentsTab';
import { ContactRound } from 'lucide-react';

export default function AdminBrokerages() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <ContactRound className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Brokerages</h1>
        </div>
        <BrokeragesAndAgentsTab />
      </div>
    </AppLayout>
  );
}
