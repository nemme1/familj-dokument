import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { authFetch, getFileUrl } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { receiptCategories, documentCategories } from "@shared/schema";
import type { Document } from "@shared/schema";
import {
  Search, Filter, FileText, Trash2, Download,
  Receipt, X, ZoomIn, Calendar, DollarSign, Store,
  Archive
} from "lucide-react";

export default function GalleryPage() {
  const [docType, setDocType] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (docType !== "all") queryParams.set("type", docType);
  if (category !== "all") queryParams.set("category", category);
  if (searchQuery) queryParams.set("search", searchQuery);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", docType, category, searchQuery],
    queryFn: async () => {
      const res = await authFetch(`/api/documents?${queryParams.toString()}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/api/documents/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
      toast({ title: "Borttaget", description: "Flyttat till papperskorgen" });
      setSelectedDoc(null);
    },
  });

  const allCategories = docType === "receipt" ? receiptCategories : docType === "document" ? documentCategories : [...receiptCategories, ...documentCategories];
  const uniqueCategories = [...new Set(allCategories)];

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (docType !== "all") params.set("type", docType);
      if (category !== "all") params.set("category", category);
      const res = await authFetch(`/api/export?${params.toString()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exporterat", description: "ZIP-fil nedladdad" });
    } catch (err: any) {
      toast({ title: "Exportfel", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Galleri</h1>
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
          <Download className="w-4 h-4 mr-1" /> Exportera
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          className="pl-9"
          placeholder="Sök bland dokument..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-[130px]" data-testid="select-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            <SelectItem value="receipt">Kvitton</SelectItem>
            <SelectItem value="document">Dokument</SelectItem>
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[130px]" data-testid="select-category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla kategorier</SelectItem>
            {uniqueCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}><CardContent className="p-2"><Skeleton className="aspect-[3/4] rounded-lg mb-2" /><Skeleton className="h-3 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="hover-elevate cursor-pointer overflow-hidden"
              onClick={() => setSelectedDoc(doc)}
              data-testid={`card-gallery-${doc.id}`}
            >
              <CardContent className="p-2">
                <div className="aspect-[3/4] rounded-lg bg-muted overflow-hidden flex items-center justify-center relative">
                  {doc.mimeType.startsWith("image/") ? (
                    <img
                      src={getFileUrl(doc.id)}
                      alt={doc.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <FileText className="w-10 h-10 text-muted-foreground" />
                  )}
                  <div className="absolute top-1.5 right-1.5">
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-background/80 backdrop-blur-sm">
                      {doc.type === "receipt" ? <Receipt className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                    </Badge>
                  </div>
                </div>
                <p className="text-[11px] font-medium truncate mt-1.5">{doc.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{doc.category}</Badge>
                  {doc.ocrAmount && (
                    <span className="text-[9px] text-muted-foreground tabular-nums">{doc.ocrAmount}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Archive className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">Inga dokument hittades</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "Prova att ändra din sökning" : "Ladda upp ditt första dokument"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Document detail dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selectedDoc.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedDoc.mimeType.startsWith("image/") && (
                  <div className="rounded-lg overflow-hidden bg-muted">
                    <img
                      src={getFileUrl(selectedDoc.id)}
                      alt={selectedDoc.title}
                      className="w-full"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedDoc.category}</Badge>
                    <Badge variant="outline">{selectedDoc.type === "receipt" ? "Kvitto" : "Dokument"}</Badge>
                  </div>
                  {selectedDoc.ocrAmount && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{selectedDoc.ocrAmount}</span>
                    </div>
                  )}
                  {selectedDoc.ocrDate && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{selectedDoc.ocrDate}</span>
                    </div>
                  )}
                  {selectedDoc.ocrStore && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Store className="w-3.5 h-3.5" />
                      <span>{selectedDoc.ocrStore}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Filstorlek: {(selectedDoc.fileSize / 1024).toFixed(1)} KB</p>
                  <p>Uppladdad: {new Date(selectedDoc.createdAt).toLocaleString("sv-SE")}</p>
                </div>

                {selectedDoc.ocrText && (
                  <details className="text-xs">
                    <summary className="text-muted-foreground cursor-pointer">OCR-text</summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-[11px] whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {selectedDoc.ocrText}
                    </pre>
                  </details>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => deleteMutation.mutate(selectedDoc.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-doc"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Ta bort
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
