import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useEnviarAlerta } from "../hooks/useQueries";

interface EmergencyAlertButtonProps {
  floating?: boolean;
}

export default function EmergencyAlertButton({
  floating = false,
}: EmergencyAlertButtonProps) {
  const [sending, setSending] = useState(false);
  const enviarAlerta = useEnviarAlerta();

  const handlePress = async () => {
    if (sending) return;
    setSending(true);

    // Try to get GPS location, but don't block sending the alert
    let coords = { latitude: 0, longitude: 0 };

    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            }),
        );
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }
    } catch {
      // GPS denied or unavailable — send without location
    }

    try {
      await enviarAlerta.mutateAsync(coords);
      if (coords.latitude !== 0 || coords.longitude !== 0) {
        toast.success("Alerta enviado com localização GPS!");
      } else {
        toast.success("Alerta enviado! (sem localização GPS)");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("autorizado") || msg.includes("logada")) {
        toast.error("Você precisa estar autenticada para enviar um alerta.");
      } else {
        toast.error("Erro ao enviar alerta. Tente novamente.");
      }
    } finally {
      setSending(false);
    }
  };

  if (floating) {
    return (
      <button
        type="button"
        onClick={handlePress}
        disabled={sending}
        className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-red-600 text-white shadow-[0_0_0_0_rgba(220,38,38,1)] animate-[sos-pulse_2s_infinite] hover:bg-red-700 active:scale-95 transition-transform disabled:opacity-70"
        aria-label="Botão SOS de emergência"
      >
        {sending ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <>
            <AlertTriangle className="h-6 w-6" />
            <span className="text-[10px] font-bold leading-none mt-0.5">
              SOS
            </span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={sending}
      className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white shadow-lg animate-pulse-ring hover:opacity-90 disabled:opacity-70 transition-opacity"
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      SOS
    </button>
  );
}
