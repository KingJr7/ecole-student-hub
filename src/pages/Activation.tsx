import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from 'lucide-react';
import activationService from "@/lib/activationService";
import Logo from '@/components/logo';

export default function Activation() {
  const navigate = useNavigate();
  const [activationCode, setActivationCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingActivation, setCheckingActivation] = useState(true);

  // Vérifier si le logiciel est déjà activé au chargement
  useEffect(() => {
    const checkActivation = async () => {
      const isActivated = await activationService.verifyActivation();
      if (isActivated) {
        // Rediriger vers la page principale si déjà activé
        navigate("/");
        return;
      }
      setCheckingActivation(false);
    };

    checkActivation();
  }, [navigate]);

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      setError("Veuillez entrer un code d'activation");
      return;
    }

    if (!schoolName.trim()) {
      setError("Veuillez entrer le nom de votre établissement");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await activationService.activate(activationCode.trim(), schoolName.trim());
      
      if (result.success) {
        setSuccess(result.message);
        // Rediriger vers la page de classes par défaut après un court délai
        setTimeout(() => {
          navigate("/default-classes");
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Une erreur est survenue lors de l'activation.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingActivation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[450px] shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Vérification de l'activation</CardTitle>
            <CardDescription>Veuillez patienter...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[450px] shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Logo width={80} height={80} />
          </div>
          <CardTitle className="text-2xl">Bienvenue dans Ntik</CardTitle>
          <CardDescription className="text-md">
            Veuillez entrer votre code d'activation pour continuer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Succès</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">Nom de l'établissement</Label>
              <Input
                id="school-name"
                placeholder="Entrez le nom de votre établissement"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activation-code">Code d'activation</Label>
              <Input
                id="activation-code"
                placeholder="Entrez votre code d'activation"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleActivate()}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleActivate} 
            disabled={isLoading}
          >
            {isLoading ? "Activation en cours..." : "Activer le logiciel"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
