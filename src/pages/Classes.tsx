
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAvailableClasses, getClassDetails, getTeachers, addSubject } from '@/lib/mockApi';
import { useToast } from '@/components/ui/use-toast';
import { ClassWithDetails, Subject } from '@/types';

const Classes = () => {
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [currentClass, setCurrentClass] = useState<string>('');
  const [classDetails, setClassDetails] = useState<ClassWithDetails | undefined>(undefined);
  const [teachers, setTeachers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState('');
  const [newSubjectCoefficient, setNewSubjectCoefficient] = useState('1');
  const { toast } = useToast();

  useEffect(() => {
    const classes = getAvailableClasses();
    setAvailableClasses(classes);
    
    if (classes.length > 0) {
      setCurrentClass(classes[0]);
    }
  }, []);

  useEffect(() => {
    if (!currentClass) return;

    const details = getClassDetails(currentClass);
    setClassDetails(details);
    
    const teachersList = getTeachers();
    setTeachers(teachersList);
  }, [currentClass]);

  const handleClassChange = (className: string) => {
    setCurrentClass(className);
  };

  const getClassIdByName = (className: string): number => {
    const classIdMap: Record<string, number> = {
      'Terminale A': 1,
      'Terminale C': 2,
      'Terminale D': 3,
      'Première A': 4,
      'Première C': 5,
      'Première D': 6,
      'Seconde A': 7,
      'Seconde C': 8,
    };
    return classIdMap[className] || 0;
  };

  const handleAddSubject = () => {
    if (!currentClass) return;
    
    try {
      addSubject({
        name: newSubjectName,
        classId: getClassIdByName(currentClass),
        teacherId: parseInt(newSubjectTeacherId),
        coefficient: parseInt(newSubjectCoefficient) || 1, // Add coefficient with default value of 1
      });
      
      // Refresh class details
      const updatedClassDetails = getClassDetails(currentClass);
      setClassDetails(updatedClassDetails);
      
      // Reset form
      setNewSubjectName('');
      setNewSubjectTeacherId('');
      setNewSubjectCoefficient('1');
      setIsAddingSubject(false);
      
      toast({
        title: "Matière ajoutée",
        description: `${newSubjectName} a été ajoutée à ${currentClass}.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout de la matière.",
        variant: "destructive",
      });
    }
  };

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
        
        <Tabs defaultValue="subjects">
          <TabsList className="mb-4">
            <TabsTrigger value="subjects">Matières</TabsTrigger>
            <TabsTrigger value="schedule">Emploi du temps</TabsTrigger>
          </TabsList>
          
          <TabsContent value="subjects">
            <div className="flex justify-between items-center mb-4">
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
                      <Select value={newSubjectTeacherId} onValueChange={setNewSubjectTeacherId}>
                        <SelectTrigger id="subject-teacher">
                          <SelectValue placeholder="Sélectionner un professeur" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id.toString()}>
                              {teacher.firstName} {teacher.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Button onClick={handleAddSubject}>Ajouter</Button>
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
                {classDetails?.subjects?.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>{subject.teacher ? `${subject.teacher.firstName} ${subject.teacher.lastName}` : 'Non assigné'}</TableCell>
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
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="schedule">
            <div className="p-4 text-center text-gray-500">
              Fonctionnalité d'emploi du temps à venir
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Classes;
