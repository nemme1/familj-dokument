import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { logout } from "@/lib/auth";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import UploadPage from "@/pages/upload";
import GalleryPage from "@/pages/gallery";
import TrashPage from "@/pages/trash";
import ViewDocumentPage from "@/pages/view-document";
import NotFound from "@/pages/not-found";
import {
  Home, Images, Upload, Trash2, Sun, Moon, LogOut,
  ShieldCheck, Menu, X
} from "lucide-react";
import { useOfflineStatus } from "@/hooks/use-offline";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, WifiOff } from "lucide-react";
import { Component, ReactNode } from "react";

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("🚨 React Error Boundary caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("🚨 React Error Boundary details:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", fontFamily: "monospace", color: "red", background: "#f5f5f5" }}>
          <h1>🚨 React Error</h1>
          <pre>{this.state.error?.message}</pre>
          <details>
            <summary>Stack Trace</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: "10px", padding: "10px", background: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Hem" },
    { href: "/upload", icon: Upload, label: "Lägg till" },
    { href: "/gallery", icon: Images, label: "Dokument" },
    { href: "/trash", icon: Trash2, label: "Korg" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-inset-bottom" data-testid="nav-mobile">
      <div className="flex items-center justify-around py-3 px-4">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href === "/" && location === "/") ||
            (item.href === "/gallery" && location === "/gallery") ||
            (item.href === "/upload" && location.startsWith("/upload"));
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 min-h-[48px] ${
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Header() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm hidden sm:inline">Dokumentvalvet</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-xs text-muted-foreground hidden sm:inline">{user.name}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Byt till ljust tema" : "Byt till mörkt tema"}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={logout}
              aria-label="Logga ut"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function AuthenticatedLayout() {
  const isOnline = useOfflineStatus();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {!isOnline && (
        <Alert className="border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Du är offline. Vissa funktioner kanske inte fungerar förrän du är online igen.
          </AlertDescription>
        </Alert>
      )}
      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/upload" component={UploadPage} />
          <Route path="/gallery" component={GalleryPage} />
          <Route path="/trash" component={TrashPage} />
          <Route path="/view/:id" component={ViewDocumentPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <MobileNav />
    </div>
  );
}

function AppRouter() {
  console.log("🔄 AppRouter rendering...");
  const { isAuthenticated, loading } = useAuth();
  console.log("🔐 Auth state:", { isAuthenticated, loading });

  if (loading) {
    console.log("⏳ Auth loading, showing loading screen...");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Kontrollerar inloggning...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("🚪 Not authenticated, showing login page...");
    return <LoginPage />;
  }

  console.log("✅ Authenticated, showing main app...");
  return <AuthenticatedLayout />;
}

function App() {
  console.log("🎯 App component rendering...");
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
