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
import { Phone, MessageSquare, Printer, Calendar as CalendarIcon, Image as ImageIcon, Wrench } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PrinterInfo {
  name: string;
  displayName: string;
}

const Settings: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getSettings, updateSettings, getPrinters, setSchoolLogo, getSchoolLogoBase64, assignSchoolToOrphans } = useDatabase();

  const [formData, setFormData] = useState({ 
    schoolName: "", 
    schoolAddress: "",
    directorName: "",
    directorGender: "",
    printerName: "",
    schoolYearStartDate: null as Date | null,
  });
  const [schoolLogoPreview, setSchoolLogoPreview] = useState<string | null>(null);
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
            directorName: settings.directorName || "",
            directorGender: settings.directorGender || "",
            printerName: settings.printerName || "",
            schoolYearStartDate: settings.schoolYearStartDate ? new Date(settings.schoolYearStartDate) : null,
          });
        }
        const logoBase64 = await getSchoolLogoBase64();
        setSchoolLogoPreview(logoBase64);

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
  }, [getSettings, getPrinters, getSchoolLogoBase64, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleGenderChange = (value: "male" | "female") => {
    setFormData(prev => ({ ...prev, directorGender: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, schoolYearStartDate: date || null }));
  };

  const handlePrinterChange = (value: string) => {
    setFormData(prev => ({ ...prev, printerName: value }));
  };

  const handleLogoChange = async () => {
    try {
      const newLogoFile = await setSchoolLogo();
      if (newLogoFile) {
        const logoBase64 = await getSchoolLogoBase64();
        setSchoolLogoPreview(logoBase64);
        toast({ title: "Succès", description: "Logo de l'école mis à jour." });
      }
    } catch (error) {
      console.error("Failed to set school logo", error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour le logo.", variant: "destructive" });
    }
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

  const handleFixOrphans = async () => {
    try {
      const result = await assignSchoolToOrphans();
      toast({
        title: "Réparation terminée",
        description: `${result.updatedTeachersCount} enseignant(s) et ${result.updatedEmployeesCount} employé(s) ont été mis à jour.`,
      });
    } catch (error) {
      console.error("Erreur lors de la réparation des données:", error);
      toast({
        variant: "destructive",
        title: "Erreur de réparation",
        description: error.message,
      });
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

                <div className="space-y-2"><Label htmlFor="schoolYearStartDate">Date de la rentrée scolaire</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={`w-full justify-start text-left font-normal ${!formData.schoolYearStartDate && "text-muted-foreground"}`}><CalendarIcon className="mr-2 h-4 w-4" />{formData.schoolYearStartDate ? (format(formData.schoolYearStartDate, "PPP", { locale: fr })) : (<span>Choisir une date</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.schoolYearStartDate} onSelect={handleDateChange} initialFocus /></PopoverContent></Popover><p className="text-xs text-gray-500">Cette date sera utilisée comme point de départ pour le calcul des frais hebdomadaires.</p></div>
                
                <Separator className="my-4" />

                <div>
                  <h3 className="text-lg font-medium text-school-700 mb-4">Informations pour les bulletins</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Logo de l'école</Label>
                      <div className="flex items-center gap-4">
                        {schoolLogoPreview ? (
                          <img src={schoolLogoPreview} alt="Aperçu du logo" className="w-20 h-20 rounded-lg object-cover border" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center border">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <Button variant="outline" onClick={handleLogoChange}>Changer le logo</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="directorName">Nom du directeur/de la directrice</Label>
                      <Input
                        id="directorName"
                        value={formData.directorName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sexe du directeur/de la directrice</Label>
                      <RadioGroup
                        value={formData.directorGender}
                        onValueChange={handleGenderChange}
                        className="flex items-center gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male">Homme</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female">Femme</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
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

                <Separator className="my-4" />

                <div>
                  <h3 className="text-lg font-medium text-amber-700 mb-2">Maintenance</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Si vous rencontrez des erreurs "Accès non autorisé" en consultant les détails d'un enseignant, cela peut être dû à des données corrompues. Ce bouton assignera l'école actuelle à tous les utilisateurs qui n'en ont pas.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleFixOrphans}
                    className="w-full flex items-center justify-center text-amber-700 border-amber-500 hover:bg-amber-50"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Réparer les données des utilisateurs orphelins
                  </Button>
                </div>

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