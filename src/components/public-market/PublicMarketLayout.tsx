import { Link, useLocation } from 'react-router-dom';
import clearviewLogo from '@/assets/clearview-logo.png';

interface PublicMarketLayoutProps {
  children: React.ReactNode;
}

export function PublicMarketLayout({ children }: PublicMarketLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(210,20%,98%)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[hsl(220,13%,87%)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/market" className="flex items-center gap-3">
              <img src={clearviewLogo} alt="ClearView Commercial Realty Inc." className="h-8 w-auto" />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                to="/market"
                className="text-sm font-medium text-[hsl(222,47%,11%)] hover:text-[hsl(38,90%,55%)] transition-colors"
              >
                Available Properties
              </Link>
              <a
                href="mailto:info@clearviewcommercial.ca"
                className="hidden sm:block text-sm font-medium text-[hsl(215,16%,47%)] hover:text-[hsl(38,90%,55%)] transition-colors"
              >
                Contact Us
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[hsl(222,47%,11%)] text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <img src={clearviewLogo} alt="ClearView Commercial Realty Inc." className="h-8 w-auto brightness-0 invert mb-4" />
              <p className="text-sm text-[hsl(215,16%,70%)] max-w-xs">
                ClearView Commercial Realty Inc. — Industrial &amp; Commercial Real Estate specialists serving Western Canada.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[hsl(38,90%,55%)] uppercase tracking-wider mb-3">Properties</h4>
              <ul className="space-y-2 text-sm text-[hsl(215,16%,70%)]">
                <li><Link to="/market" className="hover:text-white transition-colors">Available Listings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[hsl(38,90%,55%)] uppercase tracking-wider mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-[hsl(215,16%,70%)]">
                <li>
                  <a href="mailto:info@clearviewcommercial.ca" className="hover:text-white transition-colors">
                    info@clearviewcommercial.ca
                  </a>
                </li>
                <li>industrialmarket.ca</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-xs text-[hsl(215,16%,47%)] text-center">
            © {new Date().getFullYear()} ClearView Commercial Realty Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
