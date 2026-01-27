import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useGlobalToast } from '@/hooks/useGlobalToast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  UserSearch
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
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { 
    name: 'CRE Tracker', 
    icon: Briefcase,
    items: [
      { name: 'Deals', href: '/deals', icon: Briefcase },
      { name: 'Prospects', href: '/prospects', icon: UserSearch },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  },
];

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'PDF Import', href: '/pdf-import', icon: FilePlus },
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
      'CRE Tracker': ['/deals', '/prospects', '/brokerages', '/agents'].includes(location.pathname),
    };
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Listen for global toasts (e.g., from background sync tasks)
  useGlobalToast();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-card border-r-3 border-foreground transform transition-all duration-200 ease-in-out lg:translate-x-0 shadow-[4px_0_0_hsl(var(--foreground))]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "lg:w-16" : "lg:w-64",
          "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex items-center gap-3 py-5 border-b-3 border-foreground bg-primary",
            sidebarCollapsed ? "px-3 justify-center" : "px-5"
          )}>
            <div className="flex items-center justify-center w-10 h-10 border-2 border-primary-foreground bg-primary-foreground/20 flex-shrink-0" style={{ borderRadius: "var(--radius)" }}>
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-black uppercase tracking-tight text-primary-foreground truncate">
                  Snapshot Builder
                </h1>
                <p className="text-xs text-primary-foreground/80 font-medium">
                  Distribution Intel
                </p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/20"
              style={{ borderRadius: "var(--radius)" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-2">
            {navigation.map((entry) => {
              if (isNavGroup(entry)) {
                // Render collapsible group
                const groupHasActiveItem = entry.items.some(item => location.pathname === item.href);
                return (
                  <div key={entry.name}>
                    <button
                      onClick={() => toggleGroup(entry.name)}
                      title={sidebarCollapsed ? entry.name : undefined}
                      className={cn(
                        "w-full flex items-center gap-3 py-3 text-sm font-bold uppercase tracking-wider transition-all border-2",
                        sidebarCollapsed ? "px-3 justify-center" : "px-4",
                        groupHasActiveItem
                          ? "bg-secondary/50 text-secondary-foreground border-foreground/50"
                          : "text-foreground/70 border-transparent hover:bg-muted hover:border-foreground hover:text-foreground"
                      )}
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <entry.icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && entry.name}
                      {!sidebarCollapsed && (
                        <ChevronDown className={cn(
                          "w-4 h-4 ml-auto transition-transform",
                          openGroups[entry.name] ? "" : "-rotate-90"
                        )} />
                      )}
                    </button>
                    {(openGroups[entry.name] || sidebarCollapsed) && (
                      <div className={cn("space-y-1", !sidebarCollapsed && "ml-4 mt-1 pl-2 border-l-2 border-foreground/20")}>
                        {entry.items.map((item) => {
                          const isActive = location.pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              onClick={() => setSidebarOpen(false)}
                              title={sidebarCollapsed ? item.name : undefined}
                              className={cn(
                                "flex items-center gap-3 py-2 text-sm font-bold uppercase tracking-wider transition-all border-2",
                                sidebarCollapsed ? "px-3 justify-center" : "px-3",
                                isActive
                                  ? "bg-secondary text-secondary-foreground border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                                  : "text-foreground/70 border-transparent hover:bg-muted hover:border-foreground hover:text-foreground"
                              )}
                              style={{ borderRadius: "var(--radius)" }}
                            >
                              <item.icon className="w-4 h-4 flex-shrink-0" />
                              {!sidebarCollapsed && item.name}
                              {!sidebarCollapsed && isActive && (
                                <ChevronRight className="w-4 h-4 ml-auto" />
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
                    "flex items-center gap-3 py-3 text-sm font-bold uppercase tracking-wider transition-all border-2",
                    sidebarCollapsed ? "px-3 justify-center" : "px-4",
                    isActive
                      ? "bg-secondary text-secondary-foreground border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                      : "text-foreground/70 border-transparent hover:bg-muted hover:border-foreground hover:text-foreground"
                  )}
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <entry.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && entry.name}
                  {!sidebarCollapsed && isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Link>
              );
            })}

            {/* Admin section */}
            {isAdmin && !roleLoading && (
              <>
                {!sidebarCollapsed && (
                  <div className="pt-4 pb-2 px-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
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
                        "flex items-center gap-3 py-3 text-sm font-bold uppercase tracking-wider transition-all border-2",
                        sidebarCollapsed ? "px-3 justify-center" : "px-4",
                        isActive
                          ? "bg-secondary text-secondary-foreground border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                          : "text-foreground/70 border-transparent hover:bg-muted hover:border-foreground hover:text-foreground"
                      )}
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && item.name}
                      {!sidebarCollapsed && isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Collapse toggle - Desktop only */}
          <div className="hidden lg:block px-3 py-2 border-t border-foreground/20">
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
          <div className="px-3 py-4 border-t-3 border-foreground">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2",
              sidebarCollapsed && "justify-center px-0"
            )}>
              <div className="w-9 h-9 border-2 border-foreground bg-primary flex items-center justify-center shadow-[2px_2px_0_hsl(var(--foreground))] flex-shrink-0" style={{ borderRadius: "var(--radius)" }}>
                <span className="text-xs font-black text-primary-foreground uppercase">
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
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-card border-b-3 border-foreground lg:hidden shadow-[0_3px_0_hsl(var(--foreground))]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 border-2 border-foreground hover:bg-muted"
            style={{ borderRadius: "var(--radius)" }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-black uppercase tracking-tight">Snapshot Builder</span>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
