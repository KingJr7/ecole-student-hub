import { useState, useEffect } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatabase } from "@/hooks/useDatabase";

// Interfaces alignées sur le schéma et les données retournées par le backend
interface Student {
  id: number;
  name: string;
  first_name: string;
  genre?: string;
  birth_date?: string;
  className?: string; // Ajouté par `loadData`
  classId?: number;   // Ajouté par `loadData`
}

interface Class {
  id: number;
  name: string;
}

interface Parent {
  id?: number;
  name?: string;
  first_name?: string;
  phone?: string;
  email?: string;
  profession?: string;
  address?: string;
}

interface CurrentStudent {
  id?: number;
  firstName?: string;
  lastName?: string;
  genre?: string;
  birthDate?: string;
  registrationDate?: string;
  classId?: number;
  parentInfo?: {
    father?: Parent;
    mother?: Parent;
  }
}

const Students = () => {
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [currentStudent, setCurrentStudent] = useState<CurrentStudent>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();
  const { 
    getAllStudents, 
    createStudent, 
    updateStudent,
    deleteStudent,
    getAllClasses,
    createRegistration,
    createParent,
    linkStudentToParent,
    getStudentParents,
  } = useDatabase();

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([
        getAllStudents(),
        getAllClasses(),
      ]);
      
      const studentsWithParents = await Promise.all(studentsData.map(async (student) => {
        const parents = await getStudentParents(student.id);
        const father = parents.find(p => p.relation === 'père');
        const mother = parents.find(p => p.relation === 'mère');
        return { ...student, parentInfo: { father, mother } };
      }));

      setStudents(studentsWithParents || []);
      setClasses(classesData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement des données.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStudents = students.filter((student) => {
    const nameMatches = `${student.first_name || ''} ${student.name || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const classMatches = selectedClass === "all" || student.className === selectedClass;
    return nameMatches && classMatches;
  });

  const handleSaveStudent = async () => {
    if (!currentStudent.firstName || !currentStudent.lastName || !currentStudent.classId) {
      toast({ title: "Champs requis", description: "Le prénom, le nom et la classe sont obligatoires.", variant: "destructive" });
      return;
    }

    try {
      const studentData = {
        name: currentStudent.lastName,
        first_name: currentStudent.firstName,
        genre: currentStudent.genre,
        birth_date: currentStudent.birthDate,
      };

      let savedStudent;
      if (currentStudent.id) {
        savedStudent = await updateStudent(currentStudent.id, studentData);
        toast({ description: "Étudiant mis à jour." });
        // Logique de mise à jour des parents si nécessaire
      } else {
        savedStudent = await createStudent(studentData);
        
        if (!savedStudent || !savedStudent.id) throw new Error("La création de l'étudiant a échoué.");

        const registrationData = {
          student_id: savedStudent.id,
          class_id: currentStudent.classId,
          school_year: "2024-2025",
          state: "inscrit",
          registration_date: currentStudent.registrationDate || new Date().toISOString().split('T')[0],
        };
        await createRegistration(registrationData);

        // Gérer les parents
        if (currentStudent.parentInfo?.father?.first_name) {
          const father = await createParent(currentStudent.parentInfo.father);
          if(father && father.id) await linkStudentToParent(savedStudent.id, father.id, 'père');
        }
        if (currentStudent.parentInfo?.mother?.first_name) {
          const mother = await createParent(currentStudent.parentInfo.mother);
          if(mother && mother.id) await linkStudentToParent(savedStudent.id, mother.id, 'mère');
        }

        toast({ description: "Étudiant créé et inscrit avec succès." });
      }
      
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({ title: "Erreur de sauvegarde", description: "Une erreur est survenue lors de la sauvegarde.", variant: "destructive" });
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await deleteStudent(studentToDelete);
      toast({ description: "Étudiant supprimé." });
      setIsDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erreur de suppression:', error);
      toast({ title: "Erreur", description: "La suppression a échoué.", variant: "destructive" });
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentStudent({ parentInfo: { father: {}, mother: {} } });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = async (student: Student) => {
    const parents = await getStudentParents(student.id);
    const father = parents.find(p => p.relation === 'père'); 
    const mother = parents.find(p => p.relation === 'mère');

    setCurrentStudent({ 
      id: student.id,
      firstName: student.first_name,
      lastName: student.name,
      genre: student.genre,
      birthDate: student.birth_date,
      classId: student.classId,
      parentInfo: { father, mother }
    });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (studentId: number) => {
    setStudentToDelete(studentId);
    setIsDeleteDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800"><Users className="mr-2 h-6 w-6" />Gestion des Élèves</h2>
          <Button onClick={handleOpenAddDialog} className="bg-school-600 hover:bg-school-700">Ajouter un élève</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher par nom..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger><SelectValue placeholder="Filtrer par classe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((cls) => (<SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-school-800">{student.first_name} {student.name}</h3>
                      <p className="text-sm font-medium text-school-600">{student.className || 'Non assignée'}</p>
                    </div>
                    <div className="text-xs font-semibold bg-school-100 text-school-700 px-2 py-1 rounded-full">
                      {student.birth_date ? `${calculateAge(student.birth_date)} ans` : 'Âge inconnu'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 border-t pt-2 mt-2">
                    <p><span className="font-semibold">Genre:</span> {student.genre || 'N/A'}</p>
                    {student.parentInfo?.father?.first_name && (
                      <p><span className="font-semibold">Père:</span> {student.parentInfo.father.first_name} {student.parentInfo.father.name} ({student.parentInfo.father.phone})</p>
                    )}
                    {student.parentInfo?.mother?.first_name && (
                      <p><span className="font-semibold">Mère:</span> {student.parentInfo.mother.first_name} {student.parentInfo.mother.name} ({student.parentInfo.mother.phone})</p>
                    )}
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenEditDialog(student)}><Pencil className="h-4 w-4 mr-1" /> Modifier</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleOpenDeleteDialog(student.id)}><Trash2 className="h-4 w-4 mr-1" /> Supprimer</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{currentStudent.id ? "Modifier" : "Ajouter"} un élève</DialogTitle></DialogHeader>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="student" className="flex-1">Infos Élève</TabsTrigger>
                <TabsTrigger value="parents" className="flex-1">Infos Parents</TabsTrigger>
              </TabsList>
              <TabsContent value="student" className="py-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Prénom</Label><Input value={currentStudent.firstName || ""} onChange={(e) => setCurrentStudent(p => ({ ...p, firstName: e.target.value }))}/></div>
                    <div className="space-y-2"><Label>Nom</Label><Input value={currentStudent.lastName || ""} onChange={(e) => setCurrentStudent(p => ({ ...p, lastName: e.target.value }))}/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Classe</Label><Select value={currentStudent.classId?.toString() || ""} onValueChange={(v) => setCurrentStudent(p => ({ ...p, classId: Number(v) }))}><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Date d'inscription (optionnel)</Label><Input type="date" value={currentStudent.registrationDate || ""} onChange={(e) => setCurrentStudent(p => ({ ...p, registrationDate: e.target.value }))}/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date de naissance</Label><Input type="date" value={currentStudent.birthDate || ""} onChange={(e) => setCurrentStudent(p => ({ ...p, birthDate: e.target.value }))}/></div>
                    <div className="space-y-2"><Label>Genre</Label><Select value={currentStudent.genre || ""} onValueChange={(v) => setCurrentStudent(p => ({ ...p, genre: v }))}><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger><SelectContent><SelectItem value="Masculin">Masculin</SelectItem><SelectItem value="Féminin">Féminin</SelectItem></SelectContent></Select></div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="parents" className="py-4">
                <div className="grid gap-4">
                  <h3 className="font-medium">Père</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Prénom</Label><Input value={currentStudent.parentInfo?.father?.first_name || ""} onChange={e => setCurrentStudent(p => ({...p, parentInfo: {...p.parentInfo, father: {...p.parentInfo?.father, first_name: e.target.value}} }))}/></div>
                    <div className="space-y-2"><Label>Nom</Label><Input value={currentStudent.parentInfo?.father?.name || ""} onChange={e => setCurrentStudent(p => ({...p, parentInfo: {...p.parentInfo, father: {...p.parentInfo?.father, name: e.target.value}} }))}/></div>
                  </div>
                   <div className="space-y-2"><Label>Téléphone</Label><Input value={currentStudent.parentInfo?.father?.phone || ""} onChange={e => setCurrentStudent(p => ({...p, parentInfo: {...p.parentInfo, father: {...p.parentInfo?.father, phone: e.target.value}} }))}/></div>
                  <h3 className="font-medium mt-4">Mère</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Prénom</Label><Input value={currentStudent.parentInfo?.mother?.first_name || ""} onChange={e => setCurrentStudent(p => ({...p, parentInfo: {...p.parentInfo, mother: {...p.parentInfo?.mother, first_name: e.target.value}} }))}/></div>
                    <div className="space-y-2"><Label>Nom</Label><Input value={currentStudent.parentInfo?.mother?.name || ""} onChange={e => setCurrentStudent(p => ({...p, parentInfo: {...p.parentInfo, mother: {...p.parentInfo?.mother, name: e.target.value}} }))}/></div>
                  </div>
                   <div className="space-y-2"><Label>Téléphone</Label><Input value={currentStudent.parentInfo?.mother?.phone || ""} onChange={e => setCurrentStudent(p => ({...p, parentInfo: {...p.parentInfo, mother: {...p.parentInfo?.mother, phone: e.target.value}} }))}/></div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button><Button onClick={handleSaveStudent}>Enregistrer</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
            <DialogDescription>Voulez-vous vraiment supprimer cet élève ? Cette action est irréversible.</DialogDescription>
            <DialogFooter><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button><Button variant="destructive" onClick={handleDeleteStudent}>Supprimer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Students;