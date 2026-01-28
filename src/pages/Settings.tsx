import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { BrokeragesAndAgentsTab } from '@/components/settings/BrokeragesAndAgentsTab';
import { Users } from 'lucide-react';

export default function Settings() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <PageHeader title="BrokerageDB" icon={Users} />
        <BrokeragesAndAgentsTab />
      </div>
    </AppLayout>
  );
}
