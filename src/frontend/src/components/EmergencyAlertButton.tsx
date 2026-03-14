import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useEnviarAlerta } from "../hooks/useQueries";

export default function EmergencyAlertButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const enviarAlerta = useEnviarAlerta();

  const handleEmergencyAlert = async () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await enviarAlerta.mutateAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success("Alerta de emergência enviado com sucesso!");
          setIsOpen(false);
        } catch (error: any) {
          toast.error(error.message || "Erro ao enviar alerta");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        toast.error(`Erro ao obter localização: ${error.message}`);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const isLoading = isGettingLocation || enviarAlerta.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="animate-pulse-ring shadow-lg"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          SOS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Alerta de Emergência
          </DialogTitle>
          <DialogDescription>
            Ao confirmar, sua localização GPS será enviada imediatamente para
            todos os agentes e administradores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 flex-shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-medium text-warning">
                  Sua localização será compartilhada
                </p>
                <p className="text-xs text-warning/80">
                  Os agentes receberão suas coordenadas GPS exatas
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleEmergencyAlert}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando alerta...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Confirmar Alerta de Emergência
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
