import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { authFetch, getFileUrl } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Document } from "@shared/schema";
import { Trash2, RotateCcw, FileText, AlertTriangle } from "lucide-react";

export default function TrashPage() {
  const { toast } = useToast();

  const { data: trashDocs, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents/trash"],
    queryFn: async () => {
      const res = await authFetch("/api/documents/trash");
      return res.json();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/api/documents/${id}/restore`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
      toast({ title: "Återställt", description: "Dokumentet har återställts" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/api/documents/${id}/permanent`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/trash"] });
      toast({ title: "Raderat", description: "Dokumentet har raderats permanent" });
    },
  });

  const getDaysLeft = (deletedAt: string | null) => {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const expiresAt = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> Papperskorg
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dokument raderas permanent efter 30 dagar
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : trashDocs && trashDocs.length > 0 ? (
        <div className="space-y-2">
          {trashDocs.map((doc) => {
            const daysLeft = getDaysLeft(doc.deletedAt);
            return (
              <Card key={doc.id} className="overflow-hidden" data-testid={`card-trash-${doc.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {doc.mimeType.startsWith("image/") ? (
                      <img src={getFileUrl(doc.id)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{doc.category}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {daysLeft} dagar kvar
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => restoreMutation.mutate(doc.id)}
                      disabled={restoreMutation.isPending}
                      data-testid={`button-restore-${doc.id}`}
                      title="Återställ"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => permanentDeleteMutation.mutate(doc.id)}
                      disabled={permanentDeleteMutation.isPending}
                      data-testid={`button-permanent-delete-${doc.id}`}
                      title="Radera permanent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trash2 className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">Papperskorgen är tom</p>
            <p className="text-xs text-muted-foreground">Borttagna dokument hamnar här</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
