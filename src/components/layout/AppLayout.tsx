import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useGlobalToast } from '@/hooks/useGlobalToast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileBottomNav } from './MobileBottomNav';
import { 
  Building2, 
  LayoutDashboard, 
  FileSpreadsheet, 
  FilePlus, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Users,
  Shield,
  Mail,
  Database,
  Receipt,
  Package,
  Settings,
  Briefcase,
  UserSearch,
  ContactRound,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

type NavigationEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavigationEntry): entry is NavGroup => {
  return 'items' in entry;
};

const navigation: NavigationEntry[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { 
    name: 'Distribution', 
    icon: Package,
    items: [
      { name: 'Listings', href: '/listings', icon: FileSpreadsheet },
      { name: 'Recipients', href: '/recipients', icon: Mail },
    ]
  },
  { name: 'Market Listings', href: '/market-listings', icon: Database },
  { 
    name: 'CRE Tracker', 
    icon: Briefcase,
    items: [
      { name: 'Overview', href: '/cre-tracker?tab=overview', icon: Briefcase },
      { name: 'Deals', href: '/cre-tracker?tab=deals', icon: Briefcase },
      { name: 'Prospects', href: '/cre-tracker?tab=prospects', icon: UserSearch },
      { name: 'Internal Listings', href: '/cre-tracker?tab=listings', icon: FileSpreadsheet },
      { name: 'BrokerageDB', href: '/cre-tracker?tab=contacts', icon: Users },
      { name: 'Contact Finder', href: '/cre-tracker?tab=contact-finder', icon: ContactRound },
    ]
  },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Tenants', href: '/tenants', icon: UserSearch },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Underwriter', href: '/underwriter', icon: Calculator },
];

const adminNavigation = [
  { name: 'Management', href: '/admin/users', icon: Users },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Default open groups based on current route
    return {
      'Distribution': ['/listings', '/recipients'].includes(location.pathname),
      'CRE Tracker': location.pathname.startsWith('/cre-tracker'),
    };
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Keep groups open when their child routes are active
  useEffect(() => {
    setOpenGroups(prev => ({
      ...prev,
      'Distribution': prev['Distribution'] || ['/listings', '/recipients'].includes(location.pathname),
      'CRE Tracker': prev['CRE Tracker'] || location.pathname.startsWith('/cre-tracker'),
    }));
  }, [location.pathname]);

  // Listen for global toasts (e.g., from background sync tasks)
  useGlobalToast();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay - only for tablet, phones use bottom nav */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-foreground/40 hidden md:block lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on phones, slide-out on tablets, always visible on desktop */}
      <aside
        className={cn(
        "fixed inset-y-0 left-0 z-40 bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-in-out lg:translate-x-0",
          "hidden md:block",
          sidebarOpen ? "translate-x-0" : "md:-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-16" : "lg:w-64",
          "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex items-center gap-3 py-4 border-b border-sidebar-border bg-sidebar",
            sidebarCollapsed ? "px-3 justify-center" : "px-4"
          )}>
            <div className="flex items-center justify-center w-9 h-9 bg-primary flex-shrink-0 rounded-lg">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold text-foreground truncate">
                  Snapshot Builder
                </h1>
                <p className="text-xs text-muted-foreground">
                  Distribution Intel
                </p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-muted-foreground hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 px-3 py-4 space-y-2 overflow-y-auto">
            {navigation.map((entry) => {
              if (isNavGroup(entry)) {
                // Render collapsible group
                const groupHasActiveItem = entry.items.some(item => {
                  const [itemPath, itemSearch] = item.href.split('?');
                  return location.pathname === itemPath && (!itemSearch || location.search === `?${itemSearch}`);
                });
                return (
                  <div key={entry.name}>
                    <button
                      onClick={() => toggleGroup(entry.name)}
                      title={sidebarCollapsed ? entry.name : undefined}
                      className={cn(
                        "w-full flex items-center gap-3 py-2.5 text-sm font-medium transition-all rounded-md",
                        sidebarCollapsed ? "px-3 justify-center" : "px-3",
                        groupHasActiveItem
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <entry.icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && entry.name}
                      {!sidebarCollapsed && (
                        <ChevronDown className={cn(
                          "w-4 h-4 ml-auto transition-transform",
                          openGroups[entry.name] ? "" : "-rotate-90"
                        )} />
                      )}
                    </button>
                    {(openGroups[entry.name] || sidebarCollapsed) && (
                      <div className={cn("space-y-1", !sidebarCollapsed && "ml-3 mt-1 pl-2 border-l border-border")}>
                        {entry.items.map((item) => {
                          const [itemPath, itemSearch] = item.href.split('?');
                          const isActive = location.pathname === itemPath && (!itemSearch || location.search === `?${itemSearch}`);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              onClick={() => setSidebarOpen(false)}
                              title={sidebarCollapsed ? item.name : undefined}
                              className={cn(
                                "flex items-center gap-3 py-2 text-sm font-medium transition-all rounded-md",
                                sidebarCollapsed ? "px-3 justify-center" : "px-3",
                                isActive
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              )}
                              style={{ borderRadius: "var(--radius)" }}
                            >
                              <item.icon className="w-4 h-4 flex-shrink-0" />
                              {!sidebarCollapsed && item.name}
                              {!sidebarCollapsed && isActive && (
                                <ChevronRight className="w-3 h-3 ml-auto text-primary" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Render single nav item
              const isActive = location.pathname === entry.href;
              return (
                <Link
                  key={entry.name}
                  to={entry.href}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? entry.name : undefined}
                className={cn(
                    "flex items-center gap-3 py-2.5 text-sm font-medium transition-all rounded-md",
                    sidebarCollapsed ? "px-3 justify-center" : "px-3",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <entry.icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && entry.name}
                  {!sidebarCollapsed && isActive && (
                    <ChevronRight className="w-3 h-3 ml-auto text-primary" />
                  )}
                </Link>
              );
            })}

            {/* Admin section */}
            {isAdmin && !roleLoading && (
              <>
                {!sidebarCollapsed && (
                  <div className="pt-4 pb-2 px-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Admin
                    </p>
                  </div>
                )}
                {sidebarCollapsed && (
                  <div className="pt-4 pb-2 flex justify-center">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center gap-3 py-2.5 text-sm font-medium transition-all rounded-md",
                        sidebarCollapsed ? "px-3 justify-center" : "px-3",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && item.name}
                      {!sidebarCollapsed && isActive && (
                        <ChevronRight className="w-3 h-3 ml-auto text-primary" />
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Collapse toggle - Desktop only */}
          <div className="hidden lg:block px-3 py-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "w-full text-foreground/70 hover:text-foreground",
                sidebarCollapsed ? "justify-center px-0" : "justify-start"
              )}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform duration-200",
                sidebarCollapsed ? "" : "rotate-180"
              )} />
              {!sidebarCollapsed && <span className="ml-2">Collapse</span>}
            </Button>
          </div>

          {/* User section */}
          <div className="px-3 py-4 border-t border-border">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2",
              sidebarCollapsed && "justify-center px-0"
            )}>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {user?.email}
                  </p>
                  {isAdmin && !roleLoading && (
                    <Badge variant="default" className="text-[10px] px-2 py-0.5 mt-1">
                      Admin
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/account')}
                title={sidebarCollapsed ? "Account Settings" : undefined}
                className={cn(
                  "flex-1 text-foreground/70 hover:text-foreground",
                  sidebarCollapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <Settings className="w-4 h-4" />
                {!sidebarCollapsed && <span className="ml-2">Settings</span>}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                title={sidebarCollapsed ? "Sign Out" : undefined}
                className={cn(
                  "flex-1 text-foreground/70 hover:text-foreground",
                  sidebarCollapsed ? "justify-center px-0" : "justify-start"
                )}
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && <span className="ml-2">Sign Out</span>}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-200",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
      )}>
        {/* Tablet header - only shows on tablets (md-lg), phones use bottom nav */}
        <header className="sticky top-0 z-30 hidden md:flex lg:hidden items-center gap-4 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-card border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Snapshot Builder</span>
          </div>
        </header>

        {/* Phone header - minimal, no hamburger since we have bottom nav */}
        <header className="sticky top-0 z-30 flex md:hidden items-center justify-center gap-2 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-card border-b border-border">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Snapshot Builder</span>
        </header>

        {/* Page content - add bottom padding on phones for nav bar */}
        <main className="min-h-screen pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation - phones only */}
      <MobileBottomNav 
        isAdmin={isAdmin && !roleLoading} 
        onSignOut={handleSignOut}
      />
    </div>
  );
}
