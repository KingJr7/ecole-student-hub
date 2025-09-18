import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase'
import { getTeachers } from '../lib/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import MainLayout from "@/components/Layout/MainLayout"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  BookOpen,
  Trash2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton";

interface Class {
  id: string
  name: string
  level: string
  students?: Student[]
  subjects?: Subject[]
}

interface Student {
  id: string
  firstName: string
  lastName: string
  className: string
  class_id?: string
}

interface Subject {
  id: string
  name: string
  teacherId: string
  teacherName?: string
  coefficient: number
  classId: string
}

interface Teacher {
  id: string
  first_name: string
  name: string
}

export default function Classes() {
  const { getAllClasses, getAllStudents, getClassSubjects, createClass, updateClass, deleteClass, createSubject } = useDatabase()
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentClass, setCurrentClass] = useState<Partial<Class>>({})
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({})
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [classesData, studentsData, teachersData] = await Promise.all([
        getAllClasses(),
        getAllStudents(),
        getTeachers(),
      ]);

      const classesWithData = await Promise.all(
        classesData.map(async (cls) => {
          const classSubjects = await getClassSubjects(cls.id);
          const subjectsWithTeacherNames = classSubjects.map(subj => {
            const teacher = teachersData.find(t => t.id === subj.teacher_id);
            return { ...subj, teacherName: teacher ? `${teacher.first_name} ${teacher.name}` : 'N/A' };
          });
          return { ...cls, subjects: subjectsWithTeacherNames };
        })
      );

      setClasses(classesWithData);
      setStudents(studentsData.map(student => ({ ...student, class_id: student.registrations[0]?.class_id, className: student.registrations[0]?.class.name })));
      setTeachers(teachersData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({ title: "Erreur", description: "Impossible de charger les données.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (cls?: Class) => {
    setCurrentClass(cls || {})
    setIsDialogOpen(true)
  }

  const handleOpenSubjectDialog = (e, cls: Class) => {
    e.preventDefault();
    setCurrentClass(cls)
    setCurrentSubject({ classId: cls.id })
    setIsSubjectDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setCurrentClass({})
    setIsDialogOpen(false)
  }

  const handleCloseSubjectDialog = () => {
    setCurrentSubject({})
    setIsSubjectDialogOpen(false)
  }

  const handleSaveClass = async () => {
    if (!currentClass.name || !currentClass.level) {
      toast({ title: "Erreur", description: "Le nom et le niveau de la classe sont requis.", variant: "destructive" })
      return
    }
    try {
      if (currentClass.id) {
        await updateClass(currentClass.id, { name: currentClass.name, level: currentClass.level });
        toast({ title: "Succès", description: "La classe a été mise à jour." });
      } else {
        await createClass({ name: currentClass.name, level: currentClass.level });
        toast({ title: "Succès", description: "La classe a été créée." });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    } finally {
      handleCloseDialog()
      loadData()
    }
  }

  const handleSaveSubject = async () => {
    if (!currentSubject.name || !currentSubject.coefficient || !currentSubject.teacherId) {
      toast({ title: "Erreur", description: "Tous les champs sont obligatoires.", variant: "destructive" });
      return;
    }
    
    try {
      await createSubject({
        name: currentSubject.name || '',
        class_id: currentClass.id || '',
        coefficient: currentSubject.coefficient || 1,
        teacher_id: currentSubject.teacherId,
        school_year: '2025-2026',
      });
      toast({ title: "Succès", description: "La matière a été ajoutée." });
      handleCloseSubjectDialog();
      loadData();
    } catch (error) {
      toast({ title: "Erreur", description: `Erreur: ${error}`, variant: "destructive" });
    }
  }

  const getStudentCount = (classId: string) => {
    return students.filter(student => student.class_id === classId).length
  }

  const handleOpenDeleteDialog = (e, cls: Class) => {
    e.preventDefault();
    setCurrentClass(cls)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteClass = async () => {
    try {
      const studentCount = getStudentCount(currentClass.id || '')
      if (studentCount > 0) {
        toast({ title: "Erreur", description: "Impossible de supprimer une classe avec des étudiants.", variant: "destructive" })
        return
      }
      await deleteClass(currentClass.id)
      toast({ title: "Succès", description: "La classe a été supprimée." })
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    } finally {
      setIsDeleteDialogOpen(false)
      setCurrentClass({})
      loadData()
    }
  }

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-extrabold tracking-tight">Gestion des Classes</h2>
          <Button onClick={() => handleOpenDialog()} className="bg-accent-hot hover:bg-accent-hot/90 text-accent-hot-foreground">
            Ajouter une classe
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gray-100 p-6">
                    <Skeleton className="h-6 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-1/2 mt-2 rounded-md" />
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-9 w-full rounded-md" />
                      <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="space-y-3 border-t pt-4">
                      <Skeleton className="h-5 w-1/3 rounded-md" />
                      <Skeleton className="h-12 w-full rounded-md" />
                      <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <Link to={`/classes/${cls.id}`} key={cls.id} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
                <Card className="overflow-hidden h-full hover:border-primary">
                  <CardContent className="p-0">
                    <div className="bg-secondary p-6">
                      <h3 className="font-bold text-lg">{cls.name}</h3>
                      <p className="text-sm text-muted-foreground">{getStudentCount(cls.id)} élèves</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => handleOpenSubjectDialog(e, cls)}><BookOpen className="h-4 w-4 mr-1" /> Ajouter matière</Button>
                        <Button size="sm" variant="destructive" onClick={(e) => handleOpenDeleteDialog(e, cls)}><Trash2 className="h-4 w-4 mr-1" /> Supprimer</Button>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-base mb-3">Matières de la classe :</h4>
                        {(cls.subjects && cls.subjects.length > 0) ? (
                          <div className="space-y-2">
                            {cls.subjects.map((subj, idx) => (
                              <div key={idx} className="rounded-md bg-secondary border p-3">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-foreground">{subj.subject.name}</span>
                                  <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded">Coef: {subj.subject.coefficient}</span>
                                </div>
                                {subj.teacherName && <div className="text-xs text-muted-foreground mt-1">Prof: {subj.teacherName}</div>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-sm">Aucune matière</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle Classe</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="name">Nom de la classe</Label><Input id="name" value={currentClass.name || ''} onChange={(e) => setCurrentClass({ ...currentClass, name: e.target.value })}/></div>
              <div className="grid gap-2"><Label htmlFor="level">Niveau</Label><Select value={currentClass.level || ''} onValueChange={(value) => setCurrentClass({ ...currentClass, level: value })}><SelectTrigger><SelectValue placeholder="Sélectionner un niveau" /></SelectTrigger><SelectContent><SelectItem value="primaire">Primaire</SelectItem><SelectItem value="college">Collège</SelectItem><SelectItem value="lycee">Lycée</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button onClick={handleSaveClass}>Créer la classe</Button><Button variant="outline" onClick={handleCloseDialog}>Annuler</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter une matière à {currentClass.name}</DialogTitle><DialogDescription>Ajoutez une nouvelle matière à cette classe et sélectionnez le professeur qui l'enseignera.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="subject-name">Nom de la matière</Label><Input id="subject-name" value={currentSubject.name || ''} onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })} placeholder="Mathématiques"/></div>
              <div className="grid gap-2"><Label htmlFor="subject-coefficient">Coefficient</Label><Input id="subject-coefficient" type="number" min="1" value={currentSubject.coefficient || ''} onChange={(e) => setCurrentSubject({ ...currentSubject, coefficient: Number(e.target.value) })} placeholder="Ex: 3"/></div>
              <div className="grid gap-2"><Label htmlFor="subject-teacher">Professeur</Label>{teachers.length === 0 ? <div className="text-sm text-red-500">Aucun professeur disponible.</div> : <Select onValueChange={(value) => setCurrentSubject({ ...currentSubject, teacherId: value })} value={currentSubject.teacherId || ''}><SelectTrigger><SelectValue placeholder="Sélectionnez un professeur" /></SelectTrigger><SelectContent>{teachers.map((teacher) => (<SelectItem key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.name}</SelectItem>))}</SelectContent></Select>}</div>
            </div>
            <DialogFooter><Button variant="outline" onClick={handleCloseSubjectDialog}>Annuler</Button><Button onClick={handleSaveSubject} disabled={!currentSubject.name || !currentSubject.coefficient || !currentSubject.teacherId || teachers.length === 0}>Ajouter la matière</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle><DialogDescription>Êtes-vous sûr de vouloir supprimer la classe "{currentClass.name}" ? Cette action est irréversible.</DialogDescription></DialogHeader>
            <DialogFooter><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button><Button variant="destructive" onClick={handleDeleteClass}>Supprimer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}