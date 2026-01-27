import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrokeragesAndAgentsTab } from '@/components/settings/BrokeragesAndAgentsTab';
import { InvitesTab } from '@/components/settings/InvitesTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <PageHeader title="Settings" icon={SettingsIcon} />
        <Tabs defaultValue="brokerages" className="space-y-6">
          <TabsList>
            <TabsTrigger value="brokerages">Brokerages & Agents</TabsTrigger>
            <TabsTrigger value="invites">Team Invites</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="brokerages">
            <BrokeragesAndAgentsTab />
          </TabsContent>
          <TabsContent value="invites">
            <InvitesTab />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
