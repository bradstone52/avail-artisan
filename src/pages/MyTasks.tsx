import { AppLayout } from '@/components/layout/AppLayout';
import { CRETasksTab } from '@/components/cre-tracker/CRETasksTab';
import { CheckSquare } from 'lucide-react';

export default function MyTasks() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6" />
          <h1 className="text-2xl font-bold">My Tasks</h1>
        </div>
        <CRETasksTab />
      </div>
    </AppLayout>
  );
}
