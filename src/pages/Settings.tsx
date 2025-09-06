import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/lib/authService";
import MainLayout from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useDatabase } from "@/hooks/useDatabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageSquare, Printer } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface PrinterInfo {
  name: string;
  displayName: string;
}

const Settings: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getSettings, updateSettings, getPrinters } = useDatabase();

  const [formData, setFormData] = useState({ 
    schoolName: "", 
    schoolAddress: "",
    printerName: "",
  });
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const settings = await getSettings();
        if (settings) {
          setFormData({
            schoolName: settings.schoolName || "",
            schoolAddress: settings.schoolAddress || "",
            printerName: settings.printerName || "",
          });
        }
        const availablePrinters = await getPrinters();
        setPrinters(availablePrinters || []);
      } catch (error) {
        console.error("Failed to load settings or printers", error);
        toast({ title: "Erreur", description: "Impossible de charger les paramètres ou les imprimantes.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [getSettings, getPrinters, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handlePrinterChange = (value: string) => {
    setFormData(prev => ({ ...prev, printerName: value }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      toast({ title: "Succès", description: "Paramètres enregistrés." });
    } catch (error) {
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    setResetLoading(true);
    try {
      await authService.logout();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté.",
      });
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8">
        <h2 className="text-3xl font-bold mb-6 text-school-800">Paramètres de l'application</h2>
        <Card>
          <CardContent className="space-y-6 p-6">
            {loading ? (
              <div>Chargement...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Nom de l'école</Label>
                  <Input
                    id="schoolName"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolAddress">Adresse de l'école</Label>
                  <Input
                    id="schoolAddress"
                    value={formData.schoolAddress}
                    onChange={handleInputChange}
                  />
                </div>

                <Separator className="my-4" />

                <div>
                  <h3 className="text-lg font-medium text-school-700 mb-2">Paramètres d'impression</h3>
                  <div className="space-y-2">
                    <Label htmlFor="printerName">Imprimante pour les reçus</Label>
                    <Select value={formData.printerName} onValueChange={handlePrinterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une imprimante..." />
                      </SelectTrigger>
                      <SelectContent>
                        {printers.map(p => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Sélectionnez l'imprimante à utiliser pour l'impression des reçus.</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <h3 className="text-lg font-medium text-school-700 mb-2">Thème</h3>
                  <div className="flex items-center space-x-2">
                    <ThemeToggle />
                    <Label>Changer le thème de l'application</Label>
                  </div>
                </div>

                <Button onClick={handleSave} className="bg-school-600 hover:bg-school-700 mt-4">
                  Enregistrer les paramètres
                </Button>

                <div className="mt-8 pt-6">
                  <Separator className="my-4" />
                  <h3 className="text-lg font-medium text-school-700 mb-2">Support et assistance</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Si vous rencontrez des difficultés ou avez des questions concernant l'application,
                    n'hésitez pas à contacter notre service client qui vous assistera dans les meilleurs délais.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setIsContactDialogOpen(true)}
                    className="w-full flex items-center justify-center mb-6"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Contacter le service client
                  </Button>
                </div>

                <div>
                  <Separator className="my-4" />
                  <h3 className="text-lg font-medium text-red-700 mb-2">Déconnexion</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    En vous déconnectant, vous serez redirigé vers la page de connexion.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Déconnexion..." : "Se déconnecter"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contacter le support</DialogTitle>
            <DialogDescription>
              Pour toute assistance, veuillez nous contacter via les canaux suivants.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <a href="tel:+242065026800" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
              <Phone className="mr-3 h-5 w-5 text-blue-500" />
              <span>+242 065026800</span>
            </a>
            <a
              href="https://wa.me/242065026800"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-3 rounded-lg hover:bg-gray-100"
            >
              <MessageSquare className="mr-3 h-5 w-5 text-green-500" />
              <span>WhatsApp</span>
            </a>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsContactDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Settings;