import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrokeragesTab } from './BrokeragesTab';
import { AgentsTab } from './AgentsTab';

export function BrokeragesAndAgentsTab() {
  return (
    <Tabs defaultValue="brokerages" className="space-y-4">
      <TabsList>
        <TabsTrigger value="brokerages">Brokerages</TabsTrigger>
        <TabsTrigger value="agents">Agents</TabsTrigger>
      </TabsList>
      <TabsContent value="brokerages">
        <BrokeragesTab />
      </TabsContent>
      <TabsContent value="agents">
        <AgentsTab />
      </TabsContent>
    </Tabs>
  );
}
