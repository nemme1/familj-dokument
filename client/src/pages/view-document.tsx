import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { authFetch, getFileUrl } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Document } from "@shared/schema";
import {
  ArrowLeft, Trash2, Calendar, DollarSign, Store,
  FileText, Tag, Clock
} from "lucide-react";

export default function ViewDocumentPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: doc, isLoading } = useQuery<Document>({
    queryKey: ["/api/documents", params.id],
    queryFn: async () => {
      const res = await authFetch(`/api/documents/${params.id}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await authFetch(`/api/documents/${params.id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
      toast({ title: "Borttaget", description: "Flyttat till papperskorgen" });
      setLocation("/");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="aspect-[3/4] rounded-lg" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Dokumentet hittades inte</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLocation("/")}>
          Tillbaka
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate" data-testid="text-doc-title">{doc.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs">{doc.category}</Badge>
            <Badge variant="outline" className="text-xs">{doc.type === "receipt" ? "Kvitto" : "Dokument"}</Badge>
          </div>
        </div>
      </div>

      {/* Image */}
      {doc.mimeType.startsWith("image/") && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <img
              src={getFileUrl(doc.id)}
              alt={doc.title}
              className="w-full"
              crossOrigin="anonymous"
            />
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {doc.ocrAmount && (
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Belopp</p>
                <p className="text-sm font-medium tabular-nums" data-testid="text-amount">{doc.ocrAmount}</p>
              </div>
            </div>
          )}
          {doc.ocrDate && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Datum</p>
                <p className="text-sm font-medium">{doc.ocrDate}</p>
              </div>
            </div>
          )}
          {doc.ocrStore && (
            <div className="flex items-center gap-3">
              <Store className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Butik</p>
                <p className="text-sm font-medium">{doc.ocrStore}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Kategori</p>
              <p className="text-sm font-medium">{doc.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Uppladdad</p>
              <p className="text-sm font-medium">{new Date(doc.createdAt).toLocaleString("sv-SE")}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {doc.fileName} — {(doc.fileSize / 1024).toFixed(1)} KB
          </div>
        </CardContent>
      </Card>

      {/* OCR Text */}
      {doc.ocrText && (
        <Card>
          <CardContent className="py-4">
            <details>
              <summary className="text-sm font-medium cursor-pointer">OCR-text</summary>
              <pre className="mt-3 p-3 bg-muted rounded-lg text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                {doc.ocrText}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        data-testid="button-delete"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Flytta till papperskorgen
      </Button>
    </div>
  );
}
