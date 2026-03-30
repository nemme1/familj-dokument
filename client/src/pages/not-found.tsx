import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <FileQuestion className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold mb-2">Sidan hittades inte</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Kontrollera att adressen stämmer eller gå tillbaka till dina dokument
      </p>
      <Link href="/">
        <Button size="lg" className="h-12 px-6">
          <Home className="w-5 h-5 mr-2" /> Till startsidan
        </Button>
      </Link>
    </div>
  );
}
