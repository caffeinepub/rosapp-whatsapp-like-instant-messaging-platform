import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { Button } from "./components/ui/button";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import LoginPage from "./pages/LoginPage";
import MessagingDashboard from "./pages/MessagingDashboard";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    isError,
    refetch,
  } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;

  if (isInitializing || (isAuthenticated && profileLoading && !isFetched)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando Rosapp...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (isError && isFetched) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="text-center max-w-sm px-4">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Erro de conexão
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Não foi possível conectar ao servidor. Verifique sua conexão e tente
            novamente.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              queryClient.clear();
              refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;
  if (showProfileSetup) {
    return <ProfileSetupModal />;
  }

  if (userProfile) {
    return <MessagingDashboard />;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Iniciando...</p>
      </div>
    </div>
  );
}
