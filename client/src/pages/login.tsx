import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { login, register } from "@/lib/auth";
import { ShieldCheck, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
        toast({ title: "Konto skapat", description: "Välkommen till FamiljDokument!" });
      } else {
        await login(email, password);
        toast({ title: "Inloggad", description: "Välkommen tillbaka!" });
      }
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-background via-background to-card">
      {/* Hero Section - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center pr-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold mb-6 text-foreground leading-tight">
            Familj
            <span className="text-primary"> Arkiv</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Ett säkert hemmet för era viktiga dokument. Lagra, organisera och dela med din familj — helt privat och enkelt.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <ShieldCheck className="w-3 h-3 text-primary" />
              </div>
              <p className="text-sm text-foreground">Krypterat och privat — bara ni två kan se era filer</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <ShieldCheck className="w-3 h-3 text-primary" />
              </div>
              <p className="text-sm text-foreground">Enkel organisering med kategorier och sökning</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <ShieldCheck className="w-3 h-3 text-primary" />
              </div>
              <p className="text-sm text-foreground">Tillgängligt på alla enheter — mobil, surfplatta, dator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="w-full max-w-sm lg:w-1/2 lg:max-w-none lg:pl-12">
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-md">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-semibold">FamiljDokument</h2>
          <p className="text-sm text-muted-foreground mt-1">Säkert dokumentarkiv för familjen</p>
        </div>

        <Card className="border-border/60 shadow-md">
          <CardHeader className="pb-6 space-y-2">
            <CardTitle className="text-2xl">{isRegister ? "Skapa konto" : "Logga in"}</CardTitle>
            <CardDescription className="text-base">
              {isRegister 
                ? "Välkommen! Max 2 användare — du och din partner" 
                : "Ange dina uppgifter för att fortsätta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegister && (
                <div className="space-y-2.5">
                  <Label htmlFor="name" className="font-medium">Namn</Label>
                  <Input
                    id="name"
                    data-testid="input-name"
                    placeholder="Ditt namn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11 bg-background/50 border-border"
                  />
                </div>
              )}
              <div className="space-y-2.5">
                <Label htmlFor="email" className="font-medium">E-postadress</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="din@epost.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-background/50 border-border"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="password" className="font-medium">Lösenord</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minst 6 tecken"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 bg-background/50 border-border pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium mt-6" 
                disabled={loading} 
                data-testid="button-submit"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isRegister ? "Skapar..." : "Loggar in..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    {isRegister ? "Skapa konto" : "Logga in"}
                  </span>
                )}
              </Button>
            </form>
            <div className="mt-6 pt-6 border-t border-border/40 text-center">
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/90 hover:underline font-medium transition-colors"
                onClick={() => setIsRegister(!isRegister)}
                data-testid="button-toggle-mode"
              >
                {isRegister 
                  ? "Har du redan ett konto? Logga in här" 
                  : "Inget konto? Registrera dig här"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Din data är helt privat och säker. Vi använder stark kryptering för att skydda dina dokument.
        </p>
      </div>
    </div>
  );
}
