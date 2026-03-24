import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
      <h1 className="text-xl font-semibold mb-2">Sidan hittades inte</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Kontrollera adressen och försök igen
      </p>
      <Link href="/">
        <Button data-testid="button-go-home">
          <Home className="w-4 h-4 mr-2" /> Till startsidan
        </Button>
      </Link>
    </div>
  );
}
