import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Upload, Archive, Trash2 } from "lucide-react";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Hem" },
    { href: "/upload", icon: Upload, label: "Lägg till" },
    { href: "/gallery", icon: Archive, label: "Dokument" },
    { href: "/trash", icon: Trash2, label: "Papperskorg" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around py-2 px-4 safe-area-inset-bottom">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href || (href === "/gallery" && location === "/");
          return (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}