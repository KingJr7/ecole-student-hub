import React, { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useDatabase } from "@/hooks/useDatabase";

const Settings: React.FC = () => {
  const { toast } = useToast();
  const { getSettings, updateSettings } = useDatabase();

  const [schoolName, setSchoolName] = useState("");
  const [paymentMonths, setPaymentMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
