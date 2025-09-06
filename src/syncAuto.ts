import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Hook global pour écouter l'événement de synchro auto envoyé par Electron Main
 * et lancer la synchro via IPC. Affiche les toasts selon l'état.
 */
export function useSyncAuto() {
  const { toast } = useToast();

  useEffect(() => {
    // @ts-ignore
    if (!window.api) return;

    // Handler pour lancer la synchro
    const handleSyncRun = async ({ schoolId, token }: { schoolId: string, token: string }) => {
      toast({ title: "Synchronisation", description: "Synchronisation en cours...", variant: "default" });
      try {
        // @ts-ignore
        const result = await window.api.invoke("sync:run", { schoolId, token });
        if (result && result.success) {
          toast({ title: "Synchronisation", description: "Synchronisation terminée avec succès !", variant: "success" });
        } else {
          toast({ title: "Synchronisation échouée", description: result?.error || "Erreur inconnue.", variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "Synchronisation échouée", description: err?.message || "Erreur inconnue.", variant: "destructive" });
      }
    };

    // Handler pour feedback de démarrage auto (optionnel)
    const handleSyncAutoStart = () => {
      toast({ title: "Synchronisation automatique", description: "Synchronisation automatique lancée au démarrage.", variant: "default" });
    };

    // @ts-ignore
    const unsubSyncRun = window.api.on("sync:run:trigger", handleSyncRun);
    // @ts-ignore
    const unsubSyncAutoStart = window.api.on("sync:auto:start", handleSyncAutoStart);

    return () => {
      if (unsubSyncRun) unsubSyncRun();
      if (unsubSyncAutoStart) unsubSyncAutoStart();
    };
  }, [toast]);
}
