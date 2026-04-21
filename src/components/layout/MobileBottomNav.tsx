import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Database,
  Briefcase,
  CheckSquare,
  MoreHorizontal,
  UserSearch,
  FileSpreadsheet,
  Building2,
  Package,
  Mail,
  Users,
  ContactRound,
  FilePlus,
  Receipt,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';

interface MobileBottomNavProps {
  isAdmin?: boolean;
  onSignOut: () => void;
}

const primaryNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
  { name: 'Deals', href: '/deals', icon: Briefcase },
  { name: 'Market', href: '/market-listings', icon: Database },
];

const moreNavItems = [
  { name: 'Prospects', href: '/prospects', icon: UserSearch },
  { name: 'Internal Listings', href: '/internal-listings', icon: FileSpreadsheet },
  { name: 'Properties', href: '/properties', icon: Building2 },
];

const distributionNavItems = [
  { name: 'Distribution Listings', href: '/listings', icon: FileSpreadsheet },
  { name: 'Recipients', href: '/recipients', icon: Mail },
];

const utilityNavItems = [
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Lease Comps', href: '/transactions', icon: Receipt },
  { name: 'Settings', href: '/account', icon: Settings },
];

const adminNavItems = [
  { name: 'Management', href: '/admin/users', icon: Users },
  { name: 'Brokerages', href: '/admin/brokerages', icon: ContactRound },
  { name: 'PDF Import', href: '/pdf-import', icon: FilePlus },
];

const allMorePaths = [
  ...moreNavItems,
  ...distributionNavItems,
  ...utilityNavItems,
  ...adminNavItems,
].map(i => i.href);

export function MobileBottomNav({ isAdmin, onSignOut }: MobileBottomNavProps) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => location.pathname === href;
  const isMoreActive = allMorePaths.some(href => location.pathname === href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-card border-t border-border safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {primaryNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[60px] transition-colors",
                active ? "text-primary" : "text-muted-foreground active:bg-accent"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className={cn(
                "text-[10px] font-medium mt-1",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* More Menu */}
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[60px] transition-colors",
                isMoreActive ? "text-primary" : "text-muted-foreground active:bg-accent"
              )}
            >
              <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "text-primary")} />
              <span className={cn(
                "text-[10px] font-medium mt-1",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}>
                More
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-56 p-2 mb-2 mr-2 bg-card border border-border shadow-lg"
            sideOffset={8}
          >
            <div className="space-y-1">
              {/* Top items */}
              {moreNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-colors",
                    isActive(item.href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}

              <div className="h-px bg-foreground/10 my-2" />

              {/* Distribution */}
              <div className="px-2 py-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3 h-3" />
                  Distribution
                </p>
              </div>
              {distributionNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-colors",
                    isActive(item.href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}

              <div className="h-px bg-foreground/10 my-2" />

              {/* Utility */}
              {utilityNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-colors",
                    isActive(item.href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}

              {/* Admin */}
              {isAdmin && (
                <>
                  <div className="h-px bg-foreground/10 my-2" />
                  <div className="px-2 py-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Admin
                    </p>
                  </div>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-colors",
                        isActive(item.href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  ))}
                </>
              )}

              <div className="h-px bg-foreground/10 my-2" />

              {/* Sign Out */}
              <button
                onClick={() => { setMoreOpen(false); onSignOut(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold text-destructive hover:bg-destructive/10 w-full transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
