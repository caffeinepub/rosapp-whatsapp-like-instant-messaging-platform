import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  MapPin,
  MapPinOff,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useEnviarAlerta } from "../hooks/useQueries";

interface EmergencyAlertButtonProps {
  floating?: boolean;
}

type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export default function EmergencyAlertButton({
  floating = false,
}: EmergencyAlertButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const enviarAlerta = useEnviarAlerta();

  // Request location as soon as the dialog opens
  useEffect(() => {
    if (!isOpen) {
      setLocationStatus("idle");
      setCoords(null);
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("granted");
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [isOpen]);

  const retryLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus("requesting");
    setCoords(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("granted");
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleEmergencyAlert = async () => {
    try {
      if (coords) {
        await enviarAlerta.mutateAsync({
          latitude: coords.lat,
          longitude: coords.lng,
        });
        toast.success("Alerta de emergência enviado com localização GPS!");
      } else {
        await enviarAlerta.mutateAsync({ latitude: 0, longitude: 0 });
        toast.success("Alerta de emergência enviado! (sem localização GPS)");
      }
      setIsOpen(false);
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("autorizado") || msg.includes("logada")) {
        toast.error("Você precisa estar autenticada para enviar um alerta.");
      } else {
        toast.error("Erro ao enviar alerta. Tente novamente.");
      }
    }
  };

  const isLoading = enviarAlerta.isPending;
  const canSend = locationStatus !== "requesting";

  const locationInfo = () => {
    switch (locationStatus) {
      case "requesting":
        return {
          icon: (
            <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-amber-500" />
          ),
          title: "Obtendo localização...",
          desc: "Permita o acesso ao GPS quando o navegador solicitar.",
          color: "amber",
        };
      case "granted":
        return {
          icon: (
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          ),
          title: "Localização ativada",
          desc: coords
            ? `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
            : "Coordenadas obtidas com sucesso.",
          color: "green",
        };
      case "denied":
        return {
          icon: <MapPinOff className="h-5 w-5 flex-shrink-0 text-orange-500" />,
          title: "Localização bloqueada",
          desc: "Autorize o GPS nas configurações do navegador para enviar localização. O alerta será enviado sem GPS.",
          color: "orange",
        };
      case "unavailable":
        return {
          icon: <MapPinOff className="h-5 w-5 flex-shrink-0 text-orange-500" />,
          title: "GPS não disponível",
          desc: "Seu dispositivo não suporta localização. O alerta será enviado sem GPS.",
          color: "orange",
        };
      default:
        return {
          icon: (
            <MapPin className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          ),
          title: "Localização",
          desc: "Aguardando...",
          color: "gray",
        };
    }
  };

  const info = locationInfo();

  const colorClasses: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    green: "border-green-200 bg-green-50 text-green-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    gray: "border-border bg-muted text-muted-foreground",
  };

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
            Um alerta será enviado imediatamente para todos os agentes com sua
            localização GPS.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Location status card */}
          <div className={`rounded-lg border p-4 ${colorClasses[info.color]}`}>
            <div className="flex items-start gap-3">
              {info.icon}
              <div className="flex-1 text-sm">
                <p className="font-semibold">{info.title}</p>
                <p className="mt-0.5 text-xs opacity-80">{info.desc}</p>
              </div>
              {locationStatus === "denied" && navigator.geolocation && (
                <button
                  type="button"
                  onClick={retryLocation}
                  className="flex-shrink-0 rounded p-1 hover:opacity-70"
                  title="Tentar novamente"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <Button
            onClick={handleEmergencyAlert}
            disabled={isLoading || !canSend}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando alerta...
              </>
            ) : locationStatus === "requesting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aguardando GPS...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Confirmar Alerta de Emergência
              </>
            )}
          </Button>

          {locationStatus === "denied" && (
            <p className="text-center text-xs text-muted-foreground">
              Para ativar o GPS: nas configurações do navegador, permita acesso
              à localização para este site.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
