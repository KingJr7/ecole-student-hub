import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useDatabase } from "@/hooks/useDatabase";
import activationService from "@/lib/activationService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Phone, MessageSquare } from "lucide-react";

const Settings: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getSettings, updateSettings } = useDatabase();

  const [schoolName, setSchoolName] = useState("");
  const [paymentMonths, setPaymentMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  useEffect(() => {
    getSettings()
      .then((settings) => {
        if (settings) {
          setSchoolName(settings.schoolName || "");
          setPaymentMonths(settings.paymentMonths || []);
        } else {
          setSchoolName("");
          setPaymentMonths([]);
        }
      })
      .catch(() => {
        setSchoolName("");
        setPaymentMonths([]);
      })
      .finally(() => setLoading(false));
  }, [getSettings]);

  const handleSave = async () => {
    try {
      await updateSettings({ schoolName, paymentMonths });
      // Recharge les settings depuis la base pour garantir la synchro
      const settings = await getSettings();
      setSchoolName(settings?.schoolName || "");
      setPaymentMonths(settings?.paymentMonths || []);
      toast({ title: "Succès", description: "Paramètres enregistrés." });
    } catch (error) {
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde.", variant: "destructive" });
    }
  };
  
  // Fonction pour réinitialiser l'activation
  const handleResetActivation = async () => {
    if (!window.confirm("Voulez-vous vraiment réinitialiser l'activation de l'application ? Cette action va vous déconnecter et vous devrez ré-activer l'application.")) {
      return;
    }
    
    setResetLoading(true);
    try {
      const success = await activationService.resetActivation();
      if (success) {
        toast({
          title: "Activation réinitialisée",
          description: "L'application va redémarrer à l'écran d'activation.",
        });
        // Rediriger vers la page d'activation après un court délai
        setTimeout(() => {
          navigate("/activation");
        }, 1500);
      } else {
        throw new Error("Échec de la réinitialisation");
      }
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de réinitialiser l'activation.",
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
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mois de paiements</Label>
                  <div className="flex space-x-2 mb-2">
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      {Array.from({length: 6}, (_, i) => (2024 + i)).map(year => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      {label: "Janvier", value: "01"},
                      {label: "Février", value: "02"},
                      {label: "Mars", value: "03"},
                      {label: "Avril", value: "04"},
                      {label: "Mai", value: "05"},
                      {label: "Juin", value: "06"},
                      {label: "Juillet", value: "07"},
                      {label: "Août", value: "08"},
                      {label: "Septembre", value: "09"},
                      {label: "Octobre", value: "10"},
                      {label: "Novembre", value: "11"},
                      {label: "Décembre", value: "12"},
                    ].map(({label, value}) => {
                      const ym = `${selectedYear}-${value}`;
                      const checked = paymentMonths.includes(ym);
                      return (
                        <label key={ym} className={`inline-flex items-center px-3 py-1 rounded-full text-sm cursor-pointer ${checked ? 'bg-blue-200' : 'bg-gray-100'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setPaymentMonths(checked
                                ? paymentMonths.filter(m => m !== ym)
                                : [...paymentMonths, ym]);
                            }}
                            className="mr-2"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {paymentMonths.sort().map((month) => (
                      <span key={month} className="inline-flex items-center px-3 py-1 bg-blue-100 rounded-full text-sm">
                        {month}
                        <button
                          type="button"
                          className="ml-2 text-red-600 hover:text-red-900"
                          onClick={() => setPaymentMonths(paymentMonths.filter(m => m !== month))}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <Button onClick={handleSave} className="bg-school-600 hover:bg-school-700">
                  Enregistrer
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
                  <h3 className="text-lg font-medium text-red-700 mb-2">Zone de danger</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    La réinitialisation de l'activation vous déconnectera et nécessitera une nouvelle activation.
                    Utilisez cette option uniquement si vous souhaitez voir à nouveau l'écran de configuration initial ou en cas de problème d'activation.                  
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleResetActivation}
                    disabled={resetLoading}
                    className="w-full"
                  >
                    {resetLoading ? "Réinitialisation en cours..." : "Réinitialiser l'activation"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modale de contact service client */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5 text-school-600" /> 
              Service client
            </DialogTitle>
            <DialogDescription>
              Nous sommes disponibles pour vous aider avec toutes vos questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium text-lg mb-2">Numéro principal et WhatsApp</h4>
              <div className="flex items-center text-xl font-semibold text-school-700 mb-2">
                <Phone className="mr-2 h-5 w-5" />
                065026800
              </div>
              <div className="flex items-center text-gray-500 text-sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Également disponible sur WhatsApp
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Heures d'ouverture: Lundi-Vendredi, 8h-17h
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsContactDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Settings;
