import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch, getFileUrl } from "@/lib/api";
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

  const recent = recentDocs?.slice(0, 2) || [];

  return (
    <div className="space-y-8">
      {/* Compact Header + Quickstart */}
      <Card className="border-border/50 bg-card/40">
        <CardContent className="py-4 px-4 sm:px-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Hej, {user?.name?.split(" ")[0] || "du"}</p>
              <p className="text-xs text-muted-foreground">Snabbstart</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <Link href="/upload?type=receipt">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" data-testid="button-new-receipt">
                  <Receipt className="w-4 h-4" />
                  Nytt kvitto
                </Button>
              </Link>
              <Link href="/upload?type=document">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" data-testid="button-new-document">
                  <FileText className="w-4 h-4" />
                  Nytt dokument
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Den h&auml;r m&aring;naden</p>
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
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
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
              <p className="text-base font-semibold mb-2">Inga dokument &auml;nnu</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                B&ouml;rja med att ladda upp ett kvitto eller ett viktigt dokument
              </p>
              <Link href="/upload">
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Ladda upp
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {recent.map((doc) => (
              <Link key={doc.id} href={`/view/${doc.id}`}>
                <Card className="hover-elevate cursor-pointer border-border/40 overflow-hidden hover:shadow-md transition-all">
                  <CardContent className="p-0">
                    <div className="aspect-[4/3] bg-muted/40 overflow-hidden">
                      {doc.mimeType.startsWith("image/") ? (
                        <img
                          src={getFileUrl(doc.id)}
                          alt={doc.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(doc.createdAt).toLocaleDateString("sv-SE")}
                      </p>
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
