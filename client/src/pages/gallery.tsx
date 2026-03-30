import { useState, useCallback } from "react";
import * as React from "react";
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
  Receipt, X, ZoomIn,
  Archive, Upload, Cloud
} from "lucide-react";

export default function GalleryPage() {
  const [docType, setDocType] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (docType !== "all") queryParams.set("type", docType);
  if (category !== "all") queryParams.set("category", category);
  if (searchQuery) queryParams.set("search", searchQuery);
  if (sortBy !== "newest") queryParams.set("sort", sortBy);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", docType, category, searchQuery, sortBy],
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

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Navigate to upload page with the dropped files
    // Since we can't pass files directly, we'll store them temporarily
    // and redirect to upload page
    sessionStorage.setItem("droppedFiles", JSON.stringify(files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified
    }))));

    // Navigate to upload page
    window.location.hash = "#/upload";
  }, []);

  // Favorites management
  const toggleFavorite = useCallback((filterKey: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(filterKey)) {
      newFavorites.delete(filterKey);
    } else {
      newFavorites.add(filterKey);
    }
    setFavorites(newFavorites);
    localStorage.setItem("gallery-favorites", JSON.stringify([...newFavorites]));
  }, [favorites]);

  // Load favorites on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("gallery-favorites");
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  }, []);

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
    <div 
      className="space-y-6 pb-24 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag and drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-8 text-center max-w-sm mx-4">
            <Cloud className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Släpp filer här</h3>
            <p className="text-muted-foreground">
              Ladda upp dokument genom att släppa dem här
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dokument</h1>
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
          <Download className="w-4 h-4 mr-2" /> Exportera
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          data-testid="input-search"
          className="pl-10 h-12 text-base"
          placeholder="Sök bland dina dokument..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Favorite filters */}
      {favorites.size > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center mr-2">Favoriter:</span>
          {[...favorites].map((filterKey) => {
            const [type, value] = filterKey.split(":");
            return (
              <Badge
                key={filterKey}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => {
                  if (type === "type") setDocType(value);
                  else if (type === "category") setCategory(value);
                }}
              >
                {type === "type" ? (value === "receipt" ? "Kvitton" : "Dokument") : value}
                <X
                  className="w-3 h-3 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(filterKey);
                  }}
                />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-full sm:w-[140px] h-10" data-testid="select-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            <SelectItem value="receipt">
              <div className="flex items-center justify-between w-full">
                <span>Kvitton</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite("type:receipt");
                  }}
                  className="ml-2 text-muted-foreground hover:text-foreground"
                >
                  {favorites.has("type:receipt") ? "★" : "☆"}
                </button>
              </div>
            </SelectItem>
            <SelectItem value="document">
              <div className="flex items-center justify-between w-full">
                <span>Dokument</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite("type:document");
                  }}
                  className="ml-2 text-muted-foreground hover:text-foreground"
                >
                  {favorites.has("type:document") ? "★" : "☆"}
                </button>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[160px] h-10" data-testid="select-category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla kategorier</SelectItem>
            {uniqueCategories.map((c) => (
              <SelectItem key={c} value={c}>
                <div className="flex items-center justify-between w-full">
                  <span>{c}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(`category:${c}`);
                    }}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    {favorites.has(`category:${c}`) ? "★" : "☆"}
                  </button>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "title") => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[130px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Nyast först</SelectItem>
            <SelectItem value="oldest">Äldst först</SelectItem>
            <SelectItem value="title">Alfabetiskt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-3">
                <Skeleton className="aspect-[4/3] rounded-lg mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="hover-elevate cursor-pointer overflow-hidden group"
              onClick={() => setSelectedDoc(doc)}
              data-testid={`card-gallery-${doc.id}`}
            >
              <CardContent className="p-0">
                <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                  {doc.mimeType.startsWith("image/") ? (
                    <img
                      src={getFileUrl(doc.id)}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="text-xs px-2 py-1 bg-background/90 backdrop-blur-sm">
                      {doc.type === "receipt" ? <Receipt className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-sm mb-1 line-clamp-2">{doc.title}</h3>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString("sv-SE")}
                    </span>
                  </div>
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
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Filstorlek: {(selectedDoc.fileSize / 1024).toFixed(1)} KB</p>
                  <p>Uppladdad: {new Date(selectedDoc.createdAt).toLocaleString("sv-SE")}</p>
                </div>

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
