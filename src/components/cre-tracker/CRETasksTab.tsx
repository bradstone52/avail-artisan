import { PersonalTasksSection } from '@/components/tasks/PersonalTasksSection';
import { ProspectTasksSection } from '@/components/tasks/ProspectTasksSection';

export function CRETasksTab() {
  return (
    <div className="space-y-8">
      <PersonalTasksSection />
      <div className="border-t border-border" />
      <ProspectTasksSection />
    </div>
  );
}
