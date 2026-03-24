import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Hem" },
    { href: "/upload", icon: Upload, label: "Ladda upp" },
    { href: "/gallery", icon: Images, label: "Galleri" },
    { href: "/trash", icon: Trash2, label: "Papperskorg" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border mobile-nav" data-testid="nav-mobile">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href === "/upload" && location.startsWith("/upload"));
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
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
            <span className="font-semibold text-sm hidden sm:inline">FamiljDokument</span>
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
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
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
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Kontrollerar inloggning...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
