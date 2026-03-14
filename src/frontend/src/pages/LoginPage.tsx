import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Heart } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, loginStatus, loginError, isLoginError } =
    useInternetIdentity();

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/generated/rosapp-logo-transparent.dim_200x200.png"
              alt="Rosapp"
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-2xl font-bold text-primary">Rosapp</h1>
              <p className="text-xs text-muted-foreground">
                Mensagens e Alertas de Emergência
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
              Bem-vinda ao Rosapp
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Plataforma de mensagens instantâneas com sistema de alerta de
              emergência integrado. Conecte-se com agentes e usuárias em tempo
              real.
            </p>
          </div>

          {/* Login Card */}
          <Card className="mx-auto mb-12 max-w-md shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Entrar no Sistema</CardTitle>
              <CardDescription>
                Faça login para acessar mensagens e alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoginError && loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError.message}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={login}
                disabled={isLoggingIn}
                className="w-full"
                size="lg"
              >
                {isLoggingIn ? "Conectando..." : "Entrar com Internet Identity"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Ao entrar, você concorda com nossos termos de uso e política de
                privacidade
              </p>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <img
                    src="/assets/generated/chat-bubble-icon-transparent.dim_64x64.png"
                    alt="Mensagens"
                    className="h-8 w-8"
                  />
                </div>
                <CardTitle className="text-lg">
                  Mensagens em Tempo Real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Converse com outros usuários, agentes e administradores
                  através de mensagens instantâneas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <img
                    src="/assets/generated/emergency-alert-icon-transparent.dim_64x64.png"
                    alt="Alertas"
                    className="h-8 w-8"
                  />
                </div>
                <CardTitle className="text-lg">Alertas de Emergência</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Usuárias podem enviar alertas de emergência com localização
                  GPS para agentes e administradores.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <img
                    src="/assets/generated/contacts-icon-transparent.dim_64x64.png"
                    alt="Contatos"
                    className="h-8 w-8"
                  />
                </div>
                <CardTitle className="text-lg">Lista de Contatos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Acesse todos os usuários da plataforma e inicie conversas com
                  qualquer pessoa.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-card/50 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            © 2025. Construído com{" "}
            <Heart className="h-4 w-4 fill-primary text-primary" /> usando{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
