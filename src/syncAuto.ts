import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Hook global pour écouter l'événement de synchro auto envoyé par Electron Main
 * et lancer la synchro via IPC. Affiche les toasts selon l'état.
 */
export function useSyncAuto() {
  const { toast } = useToast();

  useEffect(() => {
    // Vérifie que l'environnement Electron est accessible
    let ipcRenderer: any = null;
    try {
      ipcRenderer = window.require && window.require("electron").ipcRenderer;
    } catch (e) {}
    if (!ipcRenderer) return;

    // Handler pour lancer la synchro
    const handleSyncRun = async (_event: any, { schoolId, token }: { schoolId: string, token: string }) => {
      toast({ title: "Synchronisation", description: "Synchronisation en cours...", variant: "default" });
      try {
        const result = await ipcRenderer.invoke("sync:run", { schoolId, token });
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
      // On ne reçoit pas le token ici, il faut le récupérer depuis le stockage local
      // ou attendre que l'utilisateur soit connecté.
      // Pour l'instant, on ne fait rien de plus ici.
    };

    ipcRenderer.on("sync:run:trigger", handleSyncRun);
    ipcRenderer.on("sync:auto:start", handleSyncAutoStart);

    return () => {
      ipcRenderer.removeListener("sync:run:trigger", handleSyncRun);
      ipcRenderer.removeListener("sync:auto:start", handleSyncAutoStart);
    };
  }, [toast]);
}
