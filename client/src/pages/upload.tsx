import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { uploadDocument } from "@/lib/api";
import { Receipt, FileText } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { receiptCategories, documentCategories } from "@shared/schema";
import {
  Camera, Upload, X, Check, Loader2,
  RotateCcw, RotateCw, FileImage, Crop
} from "lucide-react";

type CropMode = "none" | "auto" | "tight";

export default function UploadPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialType = params.get("type") || "receipt";

  const [, setLocation] = useLocation();
  const [type, setType] = useState<"receipt" | "document">(initialType as any);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [contrast, setContrast] = useState(120);
  const [cropMode, setCropMode] = useState<CropMode>("auto");
  const [enhancing, setEnhancing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const categories = type === "receipt" ? receiptCategories : documentCategories;

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      toast({ title: "Kamerafel", description: "Kamera kräver HTTPS. Använd localhost eller HTTPS.", variant: "destructive" });
      return;
    }
    setCameraError(null);
    setCameraStatus("Initierar kamera...");
    setCameraLoading(true);
    setShowCamera(true);

    try {
      const constraintsList = [
        { video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { video: { facingMode: "environment" } },
        { video: true },
      ];

      let stream: MediaStream | null = null;
      for (const constraints of constraintsList) {
        try {
          setCameraStatus(`Försöker kamera: ${JSON.stringify(constraints.video)}`);
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream && stream.getVideoTracks().length > 0) {
            break;
          }
        } catch (innerErr) {
          console.warn("getUserMedia attempt failed", constraints, innerErr);
        }
      }

      if (!stream) {
        throw new Error("Kunde inte fånga kamerainnehåll");
      }

      if (stream.getVideoTracks().length === 0) {
        throw new Error("Ingen videotrack tillgänglig");
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        if (!video) {
          throw new Error("Videoelement saknas");
        }

        video.muted = true;
        video.playsInline = true;
        video.controls = false;
        video.setAttribute("playsInline", "true");

        const mediaElement = video as HTMLMediaElement & { srcObject?: MediaStream };
        if (typeof mediaElement.srcObject !== "undefined") {
          mediaElement.srcObject = stream;
        } else if ((mediaElement as any).mozSrcObject !== undefined) {
          (mediaElement as any).mozSrcObject = stream;
        } else {
          try {
            mediaElement.src = URL.createObjectURL(stream as any);
          } catch {
            console.warn("createObjectURL för MediaStream misslyckades");
          }
        }

        video.onloadedmetadata = () => {
          setCameraStatus(`Video metadata: ${video.videoWidth}x${video.videoHeight}`);
          video.play().catch((playErr) => {
            console.error("video play failed", playErr);
            setCameraError("Kunde inte spela video (autoplay-block). Ge tillåtelse och försök igen.");
          });
        };

        video.onplaying = () => {
          setCameraStatus("Kamera igång");
        };

        video.onpause = () => {
          setCameraStatus("Kamera pausad");
        };
      }

      setCameraStatus("Kamera startad");
    } catch (err: any) {
      console.error("Camera error:", err);
      let message = "Kunde inte starta kameran.";
      if (err?.name === "NotAllowedError") {
        message = "Kamerabehörighet nekad. Tillåt åtkomst i webbläsaren.";
      } else if (err?.name === "NotFoundError") {
        message = "Ingen kamera hittades.";
      } else if (err?.name === "NotReadableError") {
        message = "Kameran används av ett annat program.";
      }
      setCameraError(message);
      toast({ title: "Kamerafel", description: message, variant: "destructive" });
    } finally {
      setCameraLoading(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (preview?.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
        const f = new File([blob], `foto_${Date.now()}.jpg`, { type: "image/jpeg" });
        setFile(f);
        setPreview(URL.createObjectURL(blob));
        setRotation(0);
        setContrast(120);
        setCropMode("auto");
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const applyImageEnhancement = useCallback(async () => {
    if (!file || !file.type.startsWith("image/")) return;

    setEnhancing(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Kunde inte lasa bilden"));
        img.src = objectUrl;
      });

      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;

      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = srcH;

      if (cropMode === "auto") {
        sx = Math.floor(srcW * 0.05);
        sy = Math.floor(srcH * 0.04);
        sw = Math.floor(srcW * 0.9);
        sh = Math.floor(srcH * 0.92);
      } else if (cropMode === "tight") {
        sx = Math.floor(srcW * 0.1);
        sy = Math.floor(srcH * 0.08);
        sw = Math.floor(srcW * 0.8);
        sh = Math.floor(srcH * 0.84);
      }

      const normalizedRotation = ((rotation % 360) + 360) % 360;
      const quarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
      const outW = quarterTurn ? sh : sw;
      const outH = quarterTurn ? sw : sh;

      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Canvas hittades inte");
      }

      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Kunde inte skapa bildkontext");
      }

      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((normalizedRotation * Math.PI) / 180);
      ctx.filter = `contrast(${contrast}%)`;
      ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) {
              reject(new Error("Kunde inte skapa ny bild"));
              return;
            }
            resolve(result);
          },
          "image/jpeg",
          0.92,
        );
      });

      URL.revokeObjectURL(objectUrl);
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      const enhancedFile = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(enhancedFile);
      setPreview(URL.createObjectURL(blob));
      toast({ title: "Snabbscan klar", description: "Bild förbättrad med beskärning, kontrast och rotation" });
    } catch (err: any) {
      toast({ title: "Snabbscan misslyckades", description: err?.message || "Okänt fel", variant: "destructive" });
    } finally {
      setEnhancing(false);
    }
  }, [contrast, cropMode, file, preview, rotation, toast]);



  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraStatus(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPreview(URL.createObjectURL(f));
      setRotation(0);
      setContrast(120);
      setCropMode("auto");
    } else {
      setPreview(null);
    }
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!category) {
      toast({ title: "Välj kategori", description: "Du måste välja en kategori", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(file, {
        type,
        category,
        title: title || file.name,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });

      toast({ title: "Uppladdat", description: `${type === "receipt" ? "Kvitto" : "Dokument"} sparat!` });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setTitle("");
    setCategory("");
    setRotation(0);
    setContrast(120);
    setCropMode("auto");
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header with clear CTA */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {type === "receipt" ? "Nytt kvitto" : "Nytt dokument"}
        </h1>
        <p className="text-muted-foreground">
          Ta ett foto eller ladda upp från galleriet
        </p>
      </div>

      {/* Quick type selection - simplified */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={type === "receipt" ? "default" : "outline"}
          size="lg"
          onClick={() => setType("receipt")}
          className="flex-1 h-12"
          data-testid="button-type-receipt"
        >
          <Receipt className="w-5 h-5 mr-2" />
          Kvitto
        </Button>
        <Button
          variant={type === "document" ? "default" : "outline"}
          size="lg"
          onClick={() => setType("document")}
          className="flex-1 h-12"
          data-testid="button-type-document"
        >
          <FileText className="w-5 h-5 mr-2" />
          Dokument
        </Button>
      </div>

      {/* Camera / Preview */}
      {showCamera ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative bg-black min-h-[60vh] flex flex-col">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="flex-1 w-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera controls overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex justify-center items-center gap-8">
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    onClick={stopCamera}
                    className="w-12 h-12 rounded-full"
                    data-testid="button-cancel-camera"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                  
                  <Button 
                    size="lg" 
                    onClick={capturePhoto} 
                    className="w-16 h-16 rounded-full bg-white text-black hover:bg-white/90"
                    data-testid="button-capture"
                  >
                    <Camera className="w-7 h-7" />
                  </Button>
                </div>
                
                {cameraStatus && (
                  <p className="text-center text-white/80 text-sm mt-4">
                    {cameraStatus}
                  </p>
                )}
              </div>

              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span>Startar kamera…</span>
                </div>
              )}

              {cameraError && (
                <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg">
                  <p className="text-sm">{cameraError}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : !file ? (
        <div className="grid grid-cols-1 gap-4">
          {/* Primary CTA: Take Photo */}
          <Card
            className="hover-elevate cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
            onClick={startCamera}
            data-testid="button-open-camera"
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Ta foto</h3>
              <p className="text-sm text-muted-foreground text-center">
                Använd kameran för att fota {type === "receipt" ? "kvittot" : "dokumentet"}
              </p>
            </CardContent>
          </Card>

          {/* Secondary CTA: Upload from Gallery */}
          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-file"
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Välj från galleriet</h3>
              <p className="text-sm text-muted-foreground text-center">
                Ladda upp befintligt foto eller PDF
              </p>
            </CardContent>
          </Card>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="p-3">
            <div className="relative">
              {preview ? (
                <img src={preview} alt="Förhandsvisning" className="w-full rounded-lg" />
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <FileImage className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              )}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={reset}
                data-testid="button-reset"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {file?.type.startsWith("image/") && (
              <div className="mt-4 space-y-4 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Snabbscan</p>
                  <Button
                    size="sm"
                    onClick={applyImageEnhancement}
                    disabled={enhancing}
                    data-testid="button-quickscan-apply"
                  >
                    {enhancing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Förbättrar...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Crop className="w-4 h-4" />
                        Förbättra bild
                      </span>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Beskärning</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant={cropMode === "none" ? "default" : "outline"} onClick={() => setCropMode("none")}>Ingen</Button>
                    <Button size="sm" variant={cropMode === "auto" ? "default" : "outline"} onClick={() => setCropMode("auto")}>Auto</Button>
                    <Button size="sm" variant={cropMode === "tight" ? "default" : "outline"} onClick={() => setCropMode("tight")}>Tight</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Kontrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={90}
                    max={170}
                    step={5}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Rotation: {rotation}°</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    data-testid="button-quickscan-rotate"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Rotera
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* OCR Results & Form */}
      {file && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Spara {type === "receipt" ? "kvitto" : "dokument"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Kontrollera uppgifterna och spara
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-medium">Titel</Label>
              <Input
                id="title"
                data-testid="input-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`T.ex. ${type === "receipt" ? "ICA Maxi" : "Passkopia"}`}
                className="h-12"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12" data-testid="select-category">
                  <SelectValue placeholder="Välj kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="h-10">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Button
                className="w-full h-12 text-base font-medium"
                onClick={handleUpload}
                disabled={uploading || !category.trim()}
                data-testid="button-save"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sparar...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Spara {type === "receipt" ? "kvitto" : "dokument"}
                  </span>
                )}
              </Button>
              
              {!category.trim() && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Välj en kategori för att fortsätta
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
