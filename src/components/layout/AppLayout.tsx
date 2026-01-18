import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
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
  Users,
  Shield,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Listings', href: '/listings', icon: FileSpreadsheet },
  { name: 'Create Issue', href: '/issue-builder', icon: FilePlus },
];

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Recipients', href: '/recipients', icon: Mail },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r-3 border-foreground transform transition-transform duration-200 ease-in-out lg:translate-x-0 shadow-[4px_0_0_hsl(var(--foreground))]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b-3 border-foreground bg-primary">
            <div className="flex items-center justify-center w-10 h-10 border-2 border-primary-foreground bg-primary-foreground/20" style={{ borderRadius: "var(--radius)" }}>
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black uppercase tracking-tight text-primary-foreground truncate">
                Snapshot Builder
              </h1>
              <p className="text-xs text-primary-foreground/80 font-medium">
                Distribution Intel
              </p>
            </div>
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
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all border-2",
                    isActive
                      ? "bg-secondary text-secondary-foreground border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                      : "text-foreground/70 border-transparent hover:bg-muted hover:border-foreground hover:text-foreground"
                  )}
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Link>
              );
            })}

            {/* Admin section */}
            {isAdmin && !roleLoading && (
              <>
                <div className="pt-4 pb-2 px-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Admin
                  </p>
                </div>
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all border-2",
                        isActive
                          ? "bg-secondary text-secondary-foreground border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                          : "text-foreground/70 border-transparent hover:bg-muted hover:border-foreground hover:text-foreground"
                      )}
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {item.name}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User section */}
          <div className="px-3 py-4 border-t-3 border-foreground">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 border-2 border-foreground bg-primary flex items-center justify-center shadow-[2px_2px_0_hsl(var(--foreground))]" style={{ borderRadius: "var(--radius)" }}>
                <span className="text-xs font-black text-primary-foreground uppercase">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
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
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full mt-2 justify-start text-foreground/70 hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
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
