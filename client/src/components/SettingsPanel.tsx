import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, LogOut, User, Sun, Moon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { authFetch } from "@/lib/api";
import { logout } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export function SettingsPanel() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.email === "nemmea@gmail.com";
  const [open, setOpen] = useState(false);

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/auth/sessions"],
    queryFn: async () => {
      const res = await authFetch("/api/auth/sessions");
      return res.json();
    },
    enabled: isAdmin && open,
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          aria-label="Inställningar"
          data-testid="button-settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Inställningar</SheetTitle>
        </SheetHeader>

        {/* Konto */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Konto</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            {user?.role === "admin" && (
              <Badge variant="secondary" className="ml-auto flex-shrink-0 text-xs">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
        </section>

        <Separator className="mb-6" />

        {/* Utseende */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Utseende</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-xs text-muted-foreground">{theme === "dark" ? "Mörkt" : "Ljust"} läge aktivt</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "Ljust" : "Mörkt"}
            </Button>
          </div>
        </section>

        {/* Admin: Sessioner */}
        {isAdmin && (
          <>
            <Separator className="mb-6" />
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Aktiva sessioner
                </p>
                {sessionsData && sessionsData.totalSessions > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      if (window.confirm(`Logga ut alla ${sessionsData.totalSessions} sessioner?`)) {
                        authFetch("/api/auth/sessions/all", { method: "DELETE" }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/sessions"] });
                          setTimeout(() => logout(), 300);
                        });
                      }
                    }}
                  >
                    Logga ut alla
                  </Button>
                )}
              </div>
              {sessionsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="py-3">
                        <Skeleton className="h-5 w-40" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : sessionsData?.sessions?.length > 0 ? (
                <div className="space-y-2">
                  {sessionsData.sessions.map(
                    (s: { token: string; userId: string; user: { name: string; email: string; role: string } | null }) => {
                      const isMe = s.userId === user?.id;
                      return (
                        <Card
                          key={s.token}
                          className={`border-border/40 ${isMe ? "bg-primary/5 border-primary/20" : "bg-card/50"}`}
                        >
                          <CardContent className="py-2.5 px-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {s.user?.name ?? "Okänd"}
                                  {isMe && <span className="ml-1 text-primary">(du)</span>}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{s.user?.email}</p>
                              </div>
                            </div>
                            <Button
                              variant={isMe ? "destructive" : "ghost"}
                              size="icon"
                              className="w-7 h-7 flex-shrink-0"
                              title={isMe ? "Logga ut dig själv" : `Logga ut ${s.user?.name}`}
                              onClick={() => {
                                const msg = isMe
                                  ? "Logga ut din nuvarande session?"
                                  : `Logga ut ${s.user?.name ?? "denna session"}?`;
                                if (!window.confirm(msg)) return;
                                authFetch(`/api/auth/sessions/${encodeURIComponent(s.token)}`, {
                                  method: "DELETE",
                                }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/auth/sessions"] });
                                  if (isMe) setTimeout(() => logout(), 300);
                                });
                              }}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    }
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Inga aktiva sessioner</p>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
