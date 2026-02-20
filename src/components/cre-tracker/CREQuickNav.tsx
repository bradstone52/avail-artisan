import { Briefcase, UserSearch, Users, Calendar, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface QuickNavItem {
  title: string;
  icon: LucideIcon;
  tab: string;
  stat?: string;
  color: string;
}

interface CREQuickNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeDealsCount: number;
  prospectsCount?: number;
  listingsCount?: number;
}

export function CREQuickNav({ activeTab, setActiveTab, activeDealsCount, prospectsCount, listingsCount }: CREQuickNavProps) {
  const quickNav: QuickNavItem[] = [
    { title: 'Overview', icon: Calendar, tab: 'overview', color: 'bg-muted' },
    { title: 'Deals', icon: Briefcase, tab: 'deals', stat: `${activeDealsCount} active`, color: 'bg-primary' },
    { title: 'Prospects', icon: UserSearch, tab: 'prospects', stat: prospectsCount !== undefined ? `${prospectsCount} total` : '—', color: 'bg-secondary' },
    { title: 'Internal Listings', icon: Building2, tab: 'listings', stat: listingsCount !== undefined ? `${listingsCount} total` : '—', color: 'bg-accent' },
    { title: 'BrokerageDB', icon: Users, tab: 'contacts', color: 'bg-muted' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {quickNav.map((item) => (
        <button
          key={item.title}
          onClick={() => setActiveTab(item.tab)}
          className={`flex items-center gap-3 p-3 border-2 transition-all text-left ${
            activeTab === item.tab
              ? 'border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] bg-card'
              : 'border-foreground/20 hover:border-foreground hover:bg-muted/50'
          }`}
          style={{ borderRadius: 'var(--radius)' }}
        >
          <div className={`p-2 ${item.color} border-2 border-foreground`} style={{ borderRadius: 'var(--radius)' }}>
            <item.icon className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{item.title}</p>
            {item.stat && <p className="text-xs text-muted-foreground">{item.stat}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}
