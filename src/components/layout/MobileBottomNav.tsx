import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Database,
  Building2,
  Receipt,
  MoreHorizontal,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Package,
  FileSpreadsheet,
  Mail,
  Briefcase,
  Settings,
  LogOut,
  Users,
  FilePlus,
  Shield,
  Calculator,
} from 'lucide-react';
import { useState } from 'react';

interface MobileBottomNavProps {
  isAdmin?: boolean;
  onSignOut: () => void;
}

const primaryNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Market', href: '/market-listings', icon: Database },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Deals', href: '/transactions', icon: Receipt },
];

const moreNav = [
  { name: 'Distribution Listings', href: '/listings', icon: FileSpreadsheet },
  { name: 'Recipients', href: '/recipients', icon: Mail },
  { name: 'CRE Tracker', href: '/cre-tracker', icon: Briefcase },
  { name: 'Underwriter', href: '/underwriter', icon: Calculator },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Settings', href: '/account', icon: Settings },
];

const adminNav = [
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'PDF Import', href: '/pdf-import', icon: FilePlus },
];

export function MobileBottomNav({ isAdmin, onSignOut }: MobileBottomNavProps) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => location.pathname === href;
  const isMoreActive = [...moreNav, ...adminNav].some(item => location.pathname === item.href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-card border-t-3 border-foreground safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {primaryNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[60px] transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-foreground/60 active:bg-muted"
              )}
            >
              <item.icon className={cn("h-6 w-6", active && "text-secondary-foreground")} />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wide mt-1",
                active ? "text-secondary-foreground" : "text-foreground/60"
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
                isMoreActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-foreground/60 active:bg-muted"
              )}
            >
              <MoreHorizontal className={cn("h-6 w-6", isMoreActive && "text-secondary-foreground")} />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wide mt-1",
                isMoreActive ? "text-secondary-foreground" : "text-foreground/60"
              )}>
                More
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="end" 
            className="w-56 p-2 mb-2 mr-2 border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] bg-card"
            sideOffset={8}
          >
            <div className="space-y-1">
              {/* Distribution Section */}
              <div className="px-2 py-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Package className="w-3 h-3" />
                  Distribution
                </p>
              </div>
              {moreNav.slice(0, 2).map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-colors",
                    isActive(item.href)
                      ? "bg-secondary text-secondary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}

              <div className="h-px bg-foreground/10 my-2" />

              {/* Other Tools */}
              {moreNav.slice(2).map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-colors",
                    isActive(item.href)
                      ? "bg-secondary text-secondary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}

              {/* Admin Section */}
              {isAdmin && (
                <>
                  <div className="h-px bg-foreground/10 my-2" />
                  <div className="px-2 py-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Admin
                    </p>
                  </div>
                  {adminNav.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold transition-colors",
                        isActive(item.href)
                          ? "bg-secondary text-secondary-foreground"
                          : "text-foreground hover:bg-muted"
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
                onClick={() => {
                  setMoreOpen(false);
                  onSignOut();
                }}
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
