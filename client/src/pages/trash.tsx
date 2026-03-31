import { useState } from "react";
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
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const confirmPermanentDelete = (count: number) =>
    window.confirm(
      count === 1
        ? "Radera dokumentet permanent nu? Detta gar inte att angra."
        : `Radera ${count} dokument permanent nu? Detta gar inte att angra.`,
    );

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
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
      toast({ title: "Raderat", description: "Dokumentet har raderats permanent" });
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte radera dokumentet permanent", variant: "destructive" });
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => 
        authFetch(`/api/documents/${id}/restore`, { method: "POST" })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
      toast({ title: "Återställda", description: `${selectedDocs.size} dokument har återställts` });
      setSelectedDocs(new Set());
    },
  });

  const bulkPermanentDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => authFetch(`/api/documents/${id}/permanent`, { method: "DELETE" })));
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
      toast({ title: "Raderade", description: `${ids.length} dokument har raderats permanent` });
      setSelectedDocs(new Set());
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte radera valda dokument permanent", variant: "destructive" });
    },
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDocs(newSelected);
  };

  const selectAll = () => {
    if (trashDocs) {
      setSelectedDocs(new Set(trashDocs.map(doc => doc.id)));
    }
  };

  const clearSelection = () => {
    setSelectedDocs(new Set());
  };

  const getDaysLeft = (deletedAt: string | null) => {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const expiresAt = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Trash2 className="w-6 h-6" /> Papperskorg
        </h1>
        <p className="text-muted-foreground mt-1">
          Dokument raderas automatiskt efter 30 dagar eller direkt med knappen Radera permanent
        </p>
      </div>

      {/* Bulk actions */}
      {selectedDocs.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedDocs.size} dokument valda
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Avmarkera
                </Button>
                <Button
                  size="sm"
                  onClick={() => bulkRestoreMutation.mutate(Array.from(selectedDocs))}
                  disabled={bulkRestoreMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Återställ alla
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const ids = Array.from(selectedDocs);
                    if (!ids.length || !confirmPermanentDelete(ids.length)) return;
                    bulkPermanentDeleteMutation.mutate(ids);
                  }}
                  disabled={bulkPermanentDeleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Radera valda permanent
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select all */}
      {trashDocs && trashDocs.length > 1 && selectedDocs.size === 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Välj alla
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : trashDocs && trashDocs.length > 0 ? (
        <div className="space-y-3">
          {trashDocs.map((doc) => {
            const daysLeft = getDaysLeft(doc.deletedAt);
            return (
              <Card key={doc.id} className="overflow-hidden" data-testid={`card-trash-${doc.id}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedDocs.has(doc.id)}
                    onChange={() => toggleSelect(doc.id)}
                    className="w-5 h-5 rounded border-2 border-muted-foreground data-[checked]:bg-primary data-[checked]:border-primary"
                  />
                  <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {doc.mimeType.startsWith("image/") ? (
                      <img src={getFileUrl(doc.id)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate mb-1">{doc.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {daysLeft} dagar kvar
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => restoreMutation.mutate(doc.id)}
                      disabled={restoreMutation.isPending}
                      title="Återställ"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => {
                        if (!confirmPermanentDelete(1)) return;
                        permanentDeleteMutation.mutate(doc.id);
                      }}
                      disabled={permanentDeleteMutation.isPending}
                      title="Radera permanent"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Radera permanent
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
