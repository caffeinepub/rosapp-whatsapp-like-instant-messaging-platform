import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, MapPin, MapPinOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useEnviarAlerta } from "../hooks/useQueries";

interface EmergencyAlertButtonProps {
  floating?: boolean;
}

export default function EmergencyAlertButton({
  floating = false,
}: EmergencyAlertButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const enviarAlerta = useEnviarAlerta();

  const sendAlert = async (lat: number, lng: number) => {
    await enviarAlerta.mutateAsync({ latitude: lat, longitude: lng });
  };

  const handleEmergencyAlert = async () => {
    setIsGettingLocation(true);
    setLocationDenied(false);

    if (!navigator.geolocation) {
      try {
        await sendAlert(0, 0);
        toast.success("Alerta de emergência enviado! (sem localização GPS)");
        setIsOpen(false);
      } catch {
        toast.error("Erro ao enviar alerta. Tente novamente.");
      } finally {
        setIsGettingLocation(false);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await sendAlert(position.coords.latitude, position.coords.longitude);
          toast.success("Alerta de emergência enviado com sucesso!");
          setIsOpen(false);
        } catch {
          toast.error("Erro ao enviar alerta. Tente novamente.");
        } finally {
          setIsGettingLocation(false);
        }
      },
      async () => {
        setLocationDenied(true);
        setIsGettingLocation(false);
        try {
          await sendAlert(0, 0);
          toast.success(
            "Alerta enviado! Autorize o GPS para incluir localização.",
          );
          setIsOpen(false);
        } catch {
          toast.error("Erro ao enviar alerta. Tente novamente.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const isLoading = isGettingLocation || enviarAlerta.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {floating ? (
          <button
            type="button"
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-red-600 text-white shadow-[0_0_0_0_rgba(220,38,38,1)] animate-[sos-pulse_2s_infinite] hover:bg-red-700 active:scale-95 transition-transform"
            aria-label="Botão SOS de emergência"
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-[10px] font-bold leading-none mt-0.5">
              SOS
            </span>
          </button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            className="animate-pulse-ring shadow-lg"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            SOS
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Alerta de Emergência
          </DialogTitle>
          <DialogDescription>
            Ao confirmar, um alerta será enviado imediatamente para todos os
            agentes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              {locationDenied ? (
                <MapPinOff className="h-5 w-5 flex-shrink-0 text-warning" />
              ) : (
                <MapPin className="h-5 w-5 flex-shrink-0 text-warning" />
              )}
              <div className="text-sm">
                <p className="font-medium text-warning">
                  {locationDenied
                    ? "Localização não disponível"
                    : "Sua localização será compartilhada"}
                </p>
                <p className="text-xs text-warning/80">
                  {locationDenied
                    ? "O alerta será enviado sem localização GPS"
                    : "Os agentes receberão suas coordenadas GPS exatas"}
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
