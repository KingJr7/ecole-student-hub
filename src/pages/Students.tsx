import { useState, useEffect, useCallback } from "react";
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
import { Users, Pencil, Trash2, Search, Camera } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatabase } from "@/hooks/useDatabase";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Interfaces
interface Parent {
  id?: number;
  name?: string;
  first_name?: string;
  phone?: string;
  email?: string;
  profession?: string;
  gender?: 'Masculin' | 'Féminin';
}

interface Student {
  id: number;
  name: string;
  first_name: string;
  picture_url?: string | null;
  genre?: string;
  birth_date?: string;
  className?: string;
  classId?: number;
  parentInfo?: {
    father?: Parent;
    mother?: Parent;
  }
}

interface Class {
  id: number;
  name: string;
}

interface CurrentStudent {
  id?: number;
  firstName?: string;
  lastName?: string;
  picture_url?: string | null;
  genre?: string;
  birthDate?: string;
  registrationDate?: string;
  classId?: number;
  parentInfo?: {
    father?: Parent;
    mother?: Parent;
  }
}

const ParentFormSection = ({ 
    relation, 
    currentStudent, 
    setCurrentStudent, 
    handleSearchParent 
}: { 
    relation: 'father' | 'mother';
    currentStudent: CurrentStudent;
    setCurrentStudent: React.Dispatch<React.SetStateAction<CurrentStudent>>;
    handleSearchParent: (relation: 'father' | 'mother', phone?: string) => Promise<void>;
}) => {
    const parent = currentStudent.parentInfo?.[relation];
    
    const setParent = useCallback((field: keyof Parent, value: string) => {
        setCurrentStudent(p => ({
            ...p,
            parentInfo: {
                ...p.parentInfo,
                [relation]: { ...p.parentInfo?.[relation], [field]: value },
            },
        }));
    }, [relation, setCurrentStudent]);

    return (
        <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-semibold text-lg capitalize">{relation === 'father' ? 'Père' : 'Mère'}</h4>
            <div className="space-y-2">
                <Label>Téléphone</Label>
                <div className="flex gap-2">
                    <Input value={parent?.phone || ""} onChange={(e) => setParent('phone', e.target.value)} />
                    <Button variant="outline" size="sm" onClick={() => handleSearchParent(relation, parent?.phone)}>Rechercher</Button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prénom</Label><Input value={parent?.first_name || ""} onChange={(e) => setParent('first_name', e.target.value)} /></div>
              <div className="space-y-2"><Label>Nom</Label><Input value={parent?.name || ""} onChange={(e) => setParent('name', e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={parent?.email || ""} onChange={(e) => setParent('email', e.target.value)} /></div>
            <div className="space-y-2"><Label>Profession</Label><Input value={parent?.profession || ""} onChange={(e) => setParent('profession', e.target.value)} /></div>
        </div>
    );
}

const Students = () => {
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
    findParentByPhone,
    processStudentPhoto,
  } = useDatabase();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([ getAllStudents(), getAllClasses() ]);
      setStudents(studentsData || []);
      setClasses(classesData || []);
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur est survenue lors du chargement des données.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [getAllStudents, getAllClasses, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredStudents = students.filter((student) => {
    const nameMatches = `${student.first_name || ''} ${student.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    const classMatches = selectedClass === "all" || student.className === selectedClass;
    return nameMatches && classMatches;
  });

  const handlePhotoUpload = async () => {
    const newPhotoName = await processStudentPhoto();
    if (newPhotoName) {
      setCurrentStudent(prev => ({ ...prev, picture_url: newPhotoName }));
    }
  };

  const handleSearchParent = useCallback(async (relation: 'father' | 'mother', phone?: string) => {
    if (!phone) return;
    try {
        const parent = await findParentByPhone(phone);
        if (parent) {
            setCurrentStudent(p => ({
                ...p,
                parentInfo: {
                    ...p.parentInfo,
                    [relation]: parent,
                }
            }));
            toast({ description: "Parent trouvé et informations pré-remplies." });
        } else {
            toast({ description: "Aucun parent trouvé avec ce numéro. Vous pouvez créer un nouveau parent.", variant: "default" });
        }
    } catch (error) {
        toast({ title: "Erreur", description: "La recherche a échoué.", variant: "destructive" });
    }
  }, [findParentByPhone, toast]);

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
        picture_url: currentStudent.picture_url,
      };

      const parentsData = {
        father: { ...currentStudent.parentInfo?.father, gender: 'Masculin' },
        mother: { ...currentStudent.parentInfo?.mother, gender: 'Féminin' },
      };

      if (currentStudent.id) {
        await updateStudent(currentStudent.id, studentData, parentsData);
        toast({ description: "Étudiant mis à jour." });
      } else {
        const savedStudent = await createStudent(studentData, parentsData);
        if (!savedStudent || !savedStudent.id) throw new Error("La création de l´étudiant a échoué.");
        const registrationData = { student_id: savedStudent.id, class_id: currentStudent.classId, school_year: "2025-2026", state: "inscrit", registration_date: currentStudent.registrationDate || new Date().toISOString().split('T')[0] };
        await createRegistration(registrationData);
        toast({ description: "Étudiant créé et inscrit avec succès." });
      }
      
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Erreur de sauvegarde: ", error);
      toast({ title: "Erreur de sauvegarde", description: error.message || "Une erreur est survenue.", variant: "destructive" });
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
      toast({ title: "Erreur", description: "La suppression a échoué.", variant: "destructive" });
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentStudent({ parentInfo: { father: {}, mother: {} }, picture_url: null, registrationDate: new Date().toISOString().split('T')[0] });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (student: Student) => {
    setCurrentStudent({ id: student.id, firstName: student.first_name, lastName: student.name, picture_url: student.picture_url, genre: student.genre, birthDate: student.birth_date, classId: student.classId, parentInfo: student.parentInfo });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (studentId: number) => { setStudentToDelete(studentId); setIsDeleteDialogOpen(true); };

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-extrabold tracking-tight">Gestion des Élèves</h2>
          <div className="flex gap-2">
            
            <Button onClick={handleOpenAddDialog} className="bg-accent-hot hover:bg-accent-hot/90 text-accent-hot-foreground">Ajouter un élève</Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher par nom..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
          <div className="w-full sm:w-64"><Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger><SelectValue placeholder="Filtrer par classe" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les classes</SelectItem>{classes.map((cls) => (<SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>))}</SelectContent></Select></div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (<Card key={i}><CardContent className="p-6 flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-5 w-3/4 rounded-md" /><Skeleton className="h-4 w-1/2 rounded-md" /></div></CardContent><div className="p-4 pt-2 flex justify-end space-x-2 bg-gray-50 border-t"><Skeleton className="h-9 w-24 rounded-md" /><Skeleton className="h-9 w-28 rounded-md" /></div></Card>))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="h-full flex flex-col hover:border-primary transition-shadow duration-300">
                <CardContent className="p-6 flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={student.picture_url ? `ntik-fs://${student.picture_url}` : undefined} alt={`${student.first_name} ${student.name}`} />
                        <AvatarFallback>{student.first_name?.[0]}{student.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link to={`/students/${student.id}`}><h3 className="font-bold text-lg text-foreground hover:underline">{student.first_name} {student.name}</h3></Link>
                      <p className="text-sm font-medium text-muted-foreground">{student.className || 'Non assignée'}</p>
                    </div>
                </CardContent>
                <div className="p-4 pt-2 mt-auto flex justify-end space-x-2 bg-secondary/50 border-t">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(student); }}><Pencil className="h-4 w-4 mr-1" /> Modifier</Button>
                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(student.id); }}><Trash2 className="h-4 w-4 mr-1" /> Supprimer</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{currentStudent.id ? "Modifier" : "Ajouter"} un élève</DialogTitle></DialogHeader>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="w-full grid grid-cols-3"><TabsTrigger value="student">Infos Élève</TabsTrigger><TabsTrigger value="parents">Infos Parents</TabsTrigger><TabsTrigger value="photo">Photo</TabsTrigger></TabsList>
              <TabsContent value="student" className="py-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Prénom</Label><Input value={currentStudent.firstName || ""} onChange={(e) => setCurrentStudent(p => ({ ...p, firstName: e.target.value }))}/></div><div className="space-y-2"><Label>Nom</Label><Input value={currentStudent.lastName || ""} onChange={(e) => setCurrentStudent(p => ({ ...p, lastName: e.target.value }))}/></div></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Classe</Label><Select disabled={!!currentStudent.id} value={currentStudent.classId?.toString() || ""} onValueChange={(v) => setCurrentStudent(p => ({ ...p, classId: Number(v) }))}><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Date d'inscription</Label><Input disabled={!!currentStudent.id} type="date" value={currentStudent.registrationDate || ""} onChange={(e) => setCurrentStudent(p => ({ ...p, registrationDate: e.target.value }))}/></div></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Date de naissance</Label><Input type="date" value={currentStudent.birthDate || ""} onChange={(e) => setCurrentStudent(p => ({ ...p, birthDate: e.target.value }))}/></div><div className="space-y-2"><Label>Genre</Label><Select value={currentStudent.genre || ""} onValueChange={(v) => setCurrentStudent(p => ({ ...p, genre: v }))}><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger><SelectContent><SelectItem value="Masculin">Masculin</SelectItem><SelectItem value="Féminin">Féminin</SelectItem></SelectContent></Select></div></div>
                </div>
              </TabsContent>
              <TabsContent value="parents" className="py-4">
                <div className="grid md:grid-cols-2 gap-6">
                    <ParentFormSection 
                        relation="father" 
                        currentStudent={currentStudent} 
                        setCurrentStudent={setCurrentStudent} 
                        handleSearchParent={handleSearchParent} 
                    />
                    <ParentFormSection 
                        relation="mother" 
                        currentStudent={currentStudent} 
                        setCurrentStudent={setCurrentStudent} 
                        handleSearchParent={handleSearchParent} 
                    />
                </div>
              </TabsContent>
              <TabsContent value="photo" className="py-4 flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                    <AvatarImage src={currentStudent.picture_url ? `ntik-fs://${currentStudent.picture_url}` : undefined} />
                    <AvatarFallback><Users className="h-16 w-16"/></AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={handlePhotoUpload}><Camera className="mr-2 h-4 w-4"/>Changer la photo</Button>
              </TabsContent>
            </Tabs>
            <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button><Button onClick={handleSaveStudent}>Enregistrer</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader><DialogDescription>Voulez-vous vraiment supprimer cet élève ? Cette action est irréversible.</DialogDescription><DialogFooter><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button><Button variant="destructive" onClick={handleDeleteStudent}>Supprimer</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
};

export default Students;