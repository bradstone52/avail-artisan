import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Download, Check, Smartphone, Share, Plus, ArrowRight, Home } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt (Chrome/Edge/Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Already running as installed app
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center mb-4 border-2 border-foreground">
              <Check className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-black">You're All Set!</CardTitle>
            <CardDescription className="text-base">
              You're already using the installed app
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full h-12 text-base font-bold"
            >
              <Home className="h-5 w-5 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Just installed
  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center mb-4 border-2 border-foreground">
              <Check className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-black">App Installed!</CardTitle>
            <CardDescription className="text-base">
              Snapshot Builder is now on your home screen
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You can now close this browser and open the app from your home screen.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              className="w-full h-12 text-base font-bold"
            >
              Continue in Browser
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <Card className="max-w-md w-full border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-4 border-3 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
            <Building2 className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-black">Install Snapshot Builder</CardTitle>
          <CardDescription className="text-base">
            Add to your home screen for the best experience
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Works like a native app</p>
                <p className="text-sm text-muted-foreground">Full-screen experience without browser chrome</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Download className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Works offline</p>
                <p className="text-sm text-muted-foreground">Access your data even without internet</p>
              </div>
            </div>
          </div>

          {/* Install Instructions */}
          {isIOS ? (
            // iOS Instructions
            <div className="bg-muted rounded-lg p-4 border-2 border-foreground">
              <p className="font-bold mb-3">To install on iPad/iPhone:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div className="flex items-center gap-2">
                    <span>Tap the</span>
                    <Share className="h-5 w-5" />
                    <span className="font-semibold">Share</span>
                    <span>button</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <span>Scroll down and tap <span className="font-semibold">"Add to Home Screen"</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <span>Tap <span className="font-semibold">"Add"</span> in the top right</span>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            // Chrome/Edge/Android - can trigger install
            <Button 
              onClick={handleInstall} 
              className="w-full h-14 text-lg font-bold"
              size="lg"
            >
              <Download className="h-6 w-6 mr-2" />
              Install App
            </Button>
          ) : (
            // Fallback instructions
            <div className="bg-muted rounded-lg p-4 border-2 border-foreground">
              <p className="font-bold mb-3">To install:</p>
              <div className="space-y-2 text-sm">
                <p>• <strong>Chrome/Edge:</strong> Click the install icon in the address bar</p>
                <p>• <strong>Safari:</strong> Tap Share → Add to Home Screen</p>
              </div>
            </div>
          )}

          {/* Skip link */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="w-full text-muted-foreground"
          >
            Skip for now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
