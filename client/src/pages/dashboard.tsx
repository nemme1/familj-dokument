import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch, getFileUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Receipt, FileText, ArrowRight, TrendingUp, Upload, Camera, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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
    <div className="space-y-8">
      {/* Hero Welcome Section */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-2xl border border-primary/10 p-8 lg:p-10">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-2">
            Hej, {user?.name?.split(' ')[0] || "du"}
          </h1>
          <p className="text-lg text-muted-foreground">
            Välkommen till ditt familj arkiv. Här kan ni säkert lagra och dela viktiga dokument.
          </p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 gap-4 lg:gap-6">
        <Link href="/upload?type=receipt">
          <Card className="hover-elevate cursor-pointer border-border/60 transition-all h-full hover:shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
              <span className="font-semibold text-sm" data-testid="button-new-receipt">Nytt kvitto</span>
              <p className="text-xs text-muted-foreground mt-1">Spara kvitton & bilagor</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/upload?type=document">
          <Card className="hover-elevate cursor-pointer border-border/60 transition-all h-full hover:shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <span className="font-semibold text-sm" data-testid="button-new-document">Nytt dokument</span>
              <p className="text-xs text-muted-foreground mt-1">Försäkringar, kontrakt m.m.</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Statistics Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 block">Statistik</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="py-5 lg:py-6">
                  <Skeleton className="h-8 w-12 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="border-border/40 bg-card/50">
                <CardContent className="py-5 lg:py-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    <span className="text-2xl lg:text-3xl font-semibold" data-testid="text-total-receipts">
                      {stats?.totalReceipts || 0}
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Kvitton</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/50">
                <CardContent className="py-5 lg:py-6">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-accent" />
                    <span className="text-2xl lg:text-3xl font-semibold" data-testid="text-total-documents">
                      {stats?.totalDocuments || 0}
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Dokument</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/50">
                <CardContent className="py-5 lg:py-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-chart-3" />
                    <span className="text-2xl lg:text-3xl font-semibold whitespace-nowrap" data-testid="text-monthly-total">
                      {stats?.monthlyTotal || "0"}
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Den här månaden</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/50">
                <CardContent className="py-5 lg:py-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-4 h-4 text-chart-4" />
                    <span className="text-2xl lg:text-3xl font-semibold" data-testid="text-recent-uploads">
                      {stats?.recentUploads || 0}
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Senaste veckan</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Admin Sessions */}
      {user?.role === "admin" ? (
        <div>
          <h2 className="text-lg font-semibold mb-4">Inloggningar</h2>
          {sessionsLoading ? (
            <Card className="border-border/40">
              <CardContent className="py-5">
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/40 bg-card/50">
              <CardContent className="py-6">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-semibold">Admin</Badge>
                  <span className="text-2xl font-semibold">{sessionsData?.totalSessions ?? 0}</span>
                  <span className="text-sm text-muted-foreground">aktiva sessioner just nu</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Recent Uploads Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Senaste uppladdningar</h2>
          <Link href="/gallery">
            <Button variant="ghost" size="sm" className="text-xs" data-testid="link-view-all">
              Visa alla <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        {docsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="p-4">
                  <Skeleton className="aspect-[4/3] rounded-lg mb-3" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <Card className="border-border/40 bg-card/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                <Camera className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold mb-2">Inga dokument ännu</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Börja med att ladda upp ett kvitto eller ett viktigt dokument
              </p>
              <Link href="/upload?type=receipt">
                <Button size="sm" data-testid="button-first-upload">
                  <Plus className="w-4 h-4 mr-2" /> Ladda upp nu
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recent.map((doc) => (
              <Link key={doc.id} href={`/view/${doc.id}`}>
                <Card className="hover-elevate cursor-pointer overflow-hidden border-border/40 transition-all hover:shadow-lg" data-testid={`card-doc-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="aspect-[4/3] rounded-lg bg-muted/50 mb-3 overflow-hidden flex items-center justify-center border border-border/40">
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
                    <p className="text-xs font-semibold truncate mb-2">{doc.title}</p>
                    <Badge variant="secondary" className="text-[10px] px-2 py-1">
                      {doc.category}
                    </Badge>
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
