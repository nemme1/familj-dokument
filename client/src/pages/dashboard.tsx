import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch, getFileUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import {
  Receipt, FileText, TrendingUp, Upload,
  Camera, Plus, ArrowRight
} from "lucide-react";
import type { Document } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/documents/stats"],
    queryFn: async () => {
      const res = await authFetch("/api/documents/stats");
      return res.json();
    },
  });

  const { data: recentDocs, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await authFetch("/api/documents");
      return res.json();
    },
  });

  const recent = recentDocs?.slice(0, 6) || [];

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/auth/sessions"],
    queryFn: async () => {
      const res = await authFetch("/api/auth/sessions");
      return res.json();
    },
    enabled: user?.role === "admin",
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-welcome">
          Hej, {user?.name || "du"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ditt dokumentarkiv — snabbt och säkert
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/upload?type=receipt">
          <Card className="hover-elevate cursor-pointer border border-primary/20 bg-primary/5 transition-colors hover:bg-primary/10">
            <CardContent className="flex flex-col items-center justify-center py-6 px-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-sm" data-testid="button-new-receipt">Nytt kvitto</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/upload?type=document">
          <Card className="hover-elevate cursor-pointer border border-chart-2/20 bg-chart-2/5 transition-colors hover:bg-chart-2/10">
            <CardContent className="flex flex-col items-center justify-center py-6 px-3">
              <div className="w-12 h-12 rounded-xl bg-chart-2/10 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-[hsl(var(--chart-2))]" />
              </div>
              <span className="font-medium text-sm" data-testid="button-new-document">Nytt dokument</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="py-4"><Skeleton className="h-8 w-20 mb-1" /><Skeleton className="h-4 w-16" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span className="text-2xl font-semibold tabular-nums" data-testid="text-total-receipts">{stats?.totalReceipts || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Kvitton</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-[hsl(var(--chart-2))]" />
                  <span className="text-2xl font-semibold tabular-nums" data-testid="text-total-documents">{stats?.totalDocuments || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Dokument</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--chart-3))]" />
                  <span className="text-lg font-semibold tabular-nums whitespace-nowrap" data-testid="text-monthly-total">{stats?.monthlyTotal || "0"}</span>
                </div>
                <p className="text-xs text-muted-foreground">Denna månad (uppladdningar)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-[hsl(var(--chart-4))]" />
                  <span className="text-2xl font-semibold tabular-nums" data-testid="text-recent-uploads">{stats?.recentUploads || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Senaste veckan</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {user?.role === "admin" ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Sessioner</h2>
          </div>
          {sessionsLoading ? (
            <Card><CardContent className="py-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-24 mt-2" /></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">Admin</Badge>
                  <span className="text-lg font-semibold tabular-nums" data-testid="text-total-sessions">{sessionsData?.totalSessions ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Aktiva inloggningar just nu</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Recent uploads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Senaste uppladdningar</h2>
          <Link href="/gallery">
            <Button variant="ghost" size="sm" className="text-xs" data-testid="link-view-all">
              Visa alla <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        {docsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-3"><Skeleton className="aspect-[4/3] rounded-lg mb-2" /><Skeleton className="h-4 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Camera className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">Inga dokument ännu</p>
              <p className="text-xs text-muted-foreground mb-4">
                Ta ett foto av ett kvitto eller ladda upp ett dokument
              </p>
              <Link href="/upload?type=receipt">
                <Button size="sm" data-testid="button-first-upload">
                  <Plus className="w-4 h-4 mr-1" /> Ladda upp
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recent.map((doc) => (
              <Link key={doc.id} href={`/view/${doc.id}`}>
                <Card className="hover-elevate cursor-pointer overflow-hidden" data-testid={`card-doc-${doc.id}`}>
                  <CardContent className="p-3">
                    <div className="aspect-[4/3] rounded-lg bg-muted mb-2 overflow-hidden flex items-center justify-center">
                      {doc.mimeType.startsWith("image/") ? (
                        <img
                          src={getFileUrl(doc.id)}
                          alt={doc.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {doc.category}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
