import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { uploadDocument } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { receiptCategories, documentCategories } from "@shared/schema";
import {
  Camera, Upload, X, Check, Loader2,
  RotateCcw, FileImage, ScanLine
} from "lucide-react";

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
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrAmount, setOcrAmount] = useState("");
  const [ocrDate, setOcrDate] = useState("");
  const [ocrStore, setOcrStore] = useState("");

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
        const f = new File([blob], `foto_${Date.now()}.jpg`, { type: "image/jpeg" });
        setFile(f);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
        runOCR(f);
      },
      "image/jpeg",
      0.9
    );
  };



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
      setPreview(URL.createObjectURL(f));
      runOCR(f);
    } else {
      setPreview(null);
    }
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const runOCR = async (imageFile: File) => {
    setOcrRunning(true);
    try {
      // Dynamic import of Tesseract.js for OCR
      const Tesseract = await import("tesseract.js");
      const { data: { text } } = await Tesseract.recognize(imageFile, "swe+eng", {
        logger: () => {},
      });

      setOcrText(text);

      // Extract amount (look for patterns like 123,45 kr or SEK 123.45)
      const amountMatch = text.match(/(\d{1,}[\s\u00a0]?\d{0,3}[.,]\d{2})\s*(?:kr|SEK|:-)?/i)
        || text.match(/(?:TOTALT|Total|Summa|ATT BETALA|Kortbetalning)[:\s]*(\d{1,}[\s\u00a0]?\d{0,3}[.,]\d{2})/i);
      if (amountMatch) {
        setOcrAmount(amountMatch[1].replace(/\s/g, "").replace(".", ",") + " kr");
      }

      // Extract date
      const dateMatch = text.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})/)
        || text.match(/(\d{2}[-/.]\d{2}[-/.]\d{4})/)
        || text.match(/(\d{2}[-/.]\d{2}[-/.]\d{2})/);
      if (dateMatch) {
        setOcrDate(dateMatch[1]);
      }

      // Extract store name (usually first non-empty line)
      const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 2);
      if (lines.length > 0) {
        setOcrStore(lines[0]);
        if (!title) setTitle(lines[0]);
      }

      // Suggest category based on keywords
      const lowerText = text.toLowerCase();
      if (type === "receipt") {
        if (/ica|coop|lidl|hemköp|willys|mat|livsmedel/.test(lowerText)) setCategory("Mat");
        else if (/biltema|mekonomen|bensin|diesel|shell|preem|ingo/.test(lowerText)) setCategory("Bil");
        else if (/bauhaus|jula|biltema|ikea|möbel|hem/.test(lowerText)) setCategory("Hem");
        else if (/apotek|vårdcentral|tandläkare|recept/.test(lowerText)) setCategory("Hälsa");
        else if (/elgiganten|media|teknik|elektronik/.test(lowerText)) setCategory("Elektronik");
        else if (/hm|kappahl|lindex|kläder|mode/.test(lowerText)) setCategory("Kläder");
      }

      toast({ title: "OCR klart", description: "Text extraherad från bilden" });
    } catch (err) {
      console.error("OCR error:", err);
      toast({ title: "OCR-fel", description: "Kunde inte läsa texten. Fyll i manuellt.", variant: "destructive" });
    } finally {
      setOcrRunning(false);
    }
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
        ocrText: ocrText || undefined,
        ocrAmount: ocrAmount || undefined,
        ocrDate: ocrDate || undefined,
        ocrStore: ocrStore || undefined,
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
    setFile(null);
    setPreview(null);
    setOcrText("");
    setOcrAmount("");
    setOcrDate("");
    setOcrStore("");
    setTitle("");
    setCategory("");
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {type === "receipt" ? "Nytt kvitto" : "Nytt dokument"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ta ett foto eller ladda upp en fil
        </p>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        <Button
          variant={type === "receipt" ? "default" : "outline"}
          size="sm"
          onClick={() => setType("receipt")}
          data-testid="button-type-receipt"
        >
          Kvitto
        </Button>
        <Button
          variant={type === "document" ? "default" : "outline"}
          size="sm"
          onClick={() => setType("document")}
          data-testid="button-type-document"
        >
          Dokument
        </Button>
      </div>

      {/* Camera / Preview */}
      {showCamera ? (
        <Card>
          <CardContent className="p-3">
            <div className="relative rounded-lg overflow-hidden bg-black min-h-[250px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full min-h-[250px] object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

                      {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white text-sm p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Startar kamera…</span>
                  </div>
                </div>
              )}

              <div className="absolute top-2 left-2 right-2">
                {cameraError && (
                  <div className="text-center text-xs text-red-300 bg-red-950/60 rounded p-1">
                    {cameraError}
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button size="lg" variant="secondary" onClick={stopCamera} data-testid="button-cancel-camera">
                  <X className="w-5 h-5" />
                </Button>
                <Button size="lg" onClick={capturePhoto} className="w-16 h-16 rounded-full" data-testid="button-capture">
                  <Camera className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !file ? (
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="hover-elevate cursor-pointer"
            onClick={startCamera}
            data-testid="button-open-camera"
          >
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Camera className="w-10 h-10 text-primary mb-2" />
              <span className="text-sm font-medium">Ta foto</span>
            </CardContent>
          </Card>
          <Card
            className="hover-elevate cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-file"
          >
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Upload className="w-10 h-10 text-[hsl(var(--chart-2))] mb-2" />
              <span className="text-sm font-medium">Ladda upp</span>
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

            {ocrRunning && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <ScanLine className="w-4 h-4 animate-pulse" />
                <span>Läser text från bilden...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* OCR Results & Form */}
      {file && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Detaljer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                data-testid="input-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="T.ex. ICA Maxi 2026-03-15"
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Välj kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "receipt" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Belopp</Label>
                    <Input
                      id="amount"
                      data-testid="input-amount"
                      value={ocrAmount}
                      onChange={(e) => setOcrAmount(e.target.value)}
                      placeholder="123,45 kr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Datum</Label>
                    <Input
                      id="date"
                      data-testid="input-date"
                      value={ocrDate}
                      onChange={(e) => setOcrDate(e.target.value)}
                      placeholder="2026-03-15"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store">Butik</Label>
                  <Input
                    id="store"
                    data-testid="input-store"
                    value={ocrStore}
                    onChange={(e) => setOcrStore(e.target.value)}
                    placeholder="ICA Maxi"
                  />
                </div>
              </>
            )}

            {ocrText && (
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer">Visa OCR-text</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-[11px] whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {ocrText}
                </pre>
              </details>
            )}

            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={uploading || ocrRunning}
              data-testid="button-save"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sparar...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Spara {type === "receipt" ? "kvitto" : "dokument"}
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
