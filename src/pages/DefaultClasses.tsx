import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useDatabase } from '@/hooks/useDatabase';
import Logo from '@/components/logo';

// Liste des classes par défaut avec noms adaptés aux écoles africaines
const defaultClassesList = [
  // École maternelle
  { id: 'petite-section', name: 'Petite Section', level: 'Maternelle' },
  { id: 'moyenne-section', name: 'Moyenne Section', level: 'Maternelle' },
  { id: 'grande-section', name: 'Grande Section', level: 'Maternelle' },
  
  // École primaire
  { id: 'cp', name: 'CP', level: 'Primaire' },
  { id: 'ce1', name: 'CE1', level: 'Primaire' },
  { id: 'ce2', name: 'CE2', level: 'Primaire' },
  { id: 'cm1', name: 'CM1', level: 'Primaire' },
  { id: 'cm2', name: 'CM2', level: 'Primaire' },
  
  // Collège
  { id: '6eme', name: '6ème', level: 'Collège' },
  { id: '5eme', name: '5ème', level: 'Collège' },
  { id: '4eme', name: '4ème', level: 'Collège' },
  { id: '3eme', name: '3ème', level: 'Collège' },
  
  // Lycée
  { id: '2nde A', name: '2ndeA', level: 'Lycée' },
  { id: '1ere A', name: '1èreA', level: 'Lycée' },
  { id: 'terminale A', name: 'TerminaleA', level: 'Lycée' },
  { id: '2nde C', name: '2ndeC', level: 'Lycée' },
  { id: '1ere C', name: '1èreC', level: 'Lycée' },
  { id: 'terminale C', name: 'TerminaleC', level: 'Lycée' },
  { id: '2nde D', name: '2ndeD', level: 'Lycée' },
  { id: '1ere D', name: '1èreD', level: 'Lycée' },
  { id: 'terminale D', name: 'TerminaleD', level: 'Lycée' },
];

export default function DefaultClasses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createClass } = useDatabase();
  
  // État pour suivre les classes sélectionnées
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Grouper les classes par niveau
  const groupedClasses = defaultClassesList.reduce((groups, cls) => {
    if (!groups[cls.level]) {
      groups[cls.level] = [];
    }
    groups[cls.level].push(cls);
    return groups;
  }, {} as Record<string, typeof defaultClassesList>);
  
  // Gérer la sélection d'une classe
  const handleToggleClass = (classId: string) => {
    setSelectedClasses(prev => {
      if (prev.includes(classId)) {
        return prev.filter(id => id !== classId);
      } else {
        return [...prev, classId];
      }
    });
  };
  
  // Sélectionner toutes les classes d'un niveau
  const handleSelectLevel = (level: string) => {
    const levelClassIds = groupedClasses[level].map(cls => cls.id);
    
    // Vérifier si toutes les classes du niveau sont déjà sélectionnées
    const allSelected = levelClassIds.every(id => selectedClasses.includes(id));
    
    if (allSelected) {
      // Désélectionner toutes les classes du niveau
      setSelectedClasses(prev => prev.filter(id => !levelClassIds.includes(id)));
    } else {
      // Sélectionner toutes les classes du niveau qui ne sont pas déjà sélectionnées
      const newSelectedClasses = [...selectedClasses];
      levelClassIds.forEach(id => {
        if (!newSelectedClasses.includes(id)) {
          newSelectedClasses.push(id);
        }
      });
      setSelectedClasses(newSelectedClasses);
    }
  };
  
  // Créer les classes sélectionnées et continuer
  const handleCreateClasses = async () => {
    if (selectedClasses.length === 0) {
      toast({
        variant: "destructive",
        title: "Aucune classe sélectionnée",
        description: "Veuillez sélectionner au moins une classe ou cliquez sur 'Ignorer cette étape'.",
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Trouver les objets classe complets pour les IDs sélectionnés
      const classesToCreate = defaultClassesList.filter(cls => 
        selectedClasses.includes(cls.id)
      );
      
      // Créer chaque classe dans la base de données
      for (const cls of classesToCreate) {
        await createClass({ name: cls.name });
      }
      
      toast({
        title: "Classes créées avec succès",
        description: `${selectedClasses.length} classe(s) ont été créées.`,
      });
      
      // Rediriger vers la page principale
      navigate("/");
    } catch (err) {
      console.error("Erreur lors de la création des classes:", err);
      setError("Une erreur s'est produite lors de la création des classes.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ignorer cette étape et aller directement à la page principale
  const handleSkip = () => {
    navigate("/");
  };
  
  // Vérifier si toutes les classes d'un niveau sont sélectionnées
  const isLevelFullySelected = (level: string) => {
    return groupedClasses[level].every(cls => selectedClasses.includes(cls.id));
  };
  
  // Vérifier si au moins une classe d'un niveau est sélectionnée (pour l'état indéterminé)
  const isLevelPartiallySelected = (level: string) => {
    return groupedClasses[level].some(cls => selectedClasses.includes(cls.id)) 
      && !isLevelFullySelected(level);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-[700px] shadow-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Logo width={80} height={80} />
          </div>
          <CardTitle className="text-2xl">Sélection des classes</CardTitle>
          <CardDescription className="text-md">
            Sélectionnez les classes à créer pour votre établissement. Vous pourrez toujours en ajouter ou en modifier plus tard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {Object.entries(groupedClasses).map(([level, classes]) => (
            <div key={level} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`level-${level}`} 
                  checked={isLevelFullySelected(level)}
                  data-state={isLevelPartiallySelected(level) ? 'indeterminate' : undefined}
                  onCheckedChange={() => handleSelectLevel(level)}
                />
                <label
                  htmlFor={`level-${level}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-bold"
                >
                  {level}
                </label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                {classes.map(cls => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={cls.id} 
                      checked={selectedClasses.includes(cls.id)}
                      onCheckedChange={() => handleToggleClass(cls.id)}
                    />
                    <label
                      htmlFor={cls.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {cls.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            disabled={isLoading}
          >
            Ignorer cette étape
          </Button>
          <Button 
            onClick={handleCreateClasses} 
            disabled={isLoading || selectedClasses.length === 0}
          >
            {isLoading ? "Création en cours..." : "Créer les classes sélectionnées"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
