
import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAvailableClasses, getClassWithDetails, addSubject } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { ClassWithDetails } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Classes = () => {
  const [currentClass, setCurrentClass] = useState<string>('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacherName, setNewSubjectTeacherName] = useState('');
  const [newSubjectCoefficient, setNewSubjectCoefficient] = useState('1');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: availableClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['availableClasses'],
    queryFn: getAvailableClasses,
    onSuccess: (data) => {
      if (data.length > 0 && !currentClass) {
        setCurrentClass(data[0]);
      }
    },
  });

  const { data: classDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['classDetails', currentClass],
    queryFn: () => getClassWithDetails(currentClass),
    enabled: !!currentClass,
  });

  const addSubjectMutation = useMutation({
    mutationFn: addSubject,
    onSuccess: () => {
      // Refresh class details
      queryClient.invalidateQueries({ queryKey: ['classDetails', currentClass] });
      
      // Reset form
      setNewSubjectName('');
      setNewSubjectTeacherName('');
      setNewSubjectCoefficient('1');
      setIsAddingSubject(false);
      
      toast({
        title: "Matière ajoutée",
        description: `${newSubjectName} a été ajoutée à ${currentClass}.`,
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout de la matière.",
        variant: "destructive",
      });
    }
  });

  const handleClassChange = (className: string) => {
    setCurrentClass(className);
  };

  const handleAddSubject = () => {
    if (!currentClass || !newSubjectName || !newSubjectTeacherName || !newSubjectCoefficient) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }
    
    addSubjectMutation.mutate({
      name: newSubjectName,
      classId: currentClass,
      teacherName: newSubjectTeacherName,
      coefficient: parseInt(newSubjectCoefficient) || 1
    });
  };

  if (classesLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Chargement des classes...</h1>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gestion des Classes</h1>
        
        <div className="mb-6 flex items-center gap-4">
          <Select value={currentClass} onValueChange={handleClassChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner une classe" />
            </SelectTrigger>
            <SelectContent>
              {availableClasses.map(className => (
                <SelectItem key={className} value={className}>{className}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Matières</h2>
            <Dialog open={isAddingSubject} onOpenChange={setIsAddingSubject}>
              <DialogTrigger asChild>
                <Button>Ajouter une matière</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une matière</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label htmlFor="subject-name" className="block text-sm font-medium mb-1">
                      Nom de la matière
                    </label>
                    <Input
                      id="subject-name"
                      value={newSubjectName}
                      onChange={e => setNewSubjectName(e.target.value)}
                      placeholder="Mathématiques"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject-teacher" className="block text-sm font-medium mb-1">
                      Professeur
                    </label>
                    <Input
                      id="subject-teacher"
                      value={newSubjectTeacherName}
                      onChange={e => setNewSubjectTeacherName(e.target.value)}
                      placeholder="Nom du professeur"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject-coefficient" className="block text-sm font-medium mb-1">
                      Coefficient
                    </label>
                    <Input
                      id="subject-coefficient"
                      type="number"
                      min="1"
                      value={newSubjectCoefficient}
                      onChange={e => setNewSubjectCoefficient(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAddSubject} disabled={addSubjectMutation.isPending}>
                      {addSubjectMutation.isPending ? 'Ajout en cours...' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matière</TableHead>
                <TableHead>Professeur</TableHead>
                <TableHead>Coefficient</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    Chargement des matières...
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {classDetails?.subjects?.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>{subject.name}</TableCell>
                      <TableCell>{subject.teacherName || 'Non assigné'}</TableCell>
                      <TableCell>{subject.coefficient || 1}</TableCell>
                    </TableRow>
                  ))}
                  {(!classDetails?.subjects || classDetails.subjects.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                        Aucune matière définie pour cette classe
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
};

export default Classes;
