import { useState, useEffect } from 'react'
import { useDatabase } from '../hooks/useDatabase'
import { getTeachers } from '../lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Pencil,
  Trash2,
  GraduationCap
} from "lucide-react"

interface Class {
  id: number
  name: string
  students?: Student[]
  subjects?: Subject[]
}

interface Student {
  id: number
  firstName: string
  lastName: string
  className: string
}

interface Subject {
  id: number
  name: string
  teacherId: number
  teacherName?: string
  coefficient: number
  classId: number
  hoursPerWeek?: number
  subjectName?: string
}

interface Teacher {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  hourlyRate?: number
  speciality?: string
}

export default function Classes() {
  const { getAllClasses, getAllStudents, getClassSubjects, addClassSubject, createClass, updateClass, deleteClass, createSubject, deleteClassSubject } = useDatabase()
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentClass, setCurrentClass] = useState<Partial<Class>>({})
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      console.log('Classes: Début chargement des données')
      
      // 1. Charger les classes, les étudiants et les professeurs
      let classesData = []
      let studentsData = []
      let teachersData = []
      
      try {
        [classesData, studentsData, teachersData] = await Promise.all([
          getAllClasses(),
          getAllStudents(),
          getTeachers()
        ])
        console.log(`Classes: ${classesData.length} classes chargées`)
        console.log(`Classes: ${studentsData.length} étudiants chargés`)
        console.log(`Classes: ${teachersData.length} professeurs chargés`)
        setTeachers(teachersData)
      } catch (error) {
        console.error('Classes: Erreur lors du chargement initial:', error)
        throw error
      }
      
      // 2. Charger les matières pour chaque classe, mais gérer les erreurs individuellement
      const classesWithSubjects = await Promise.all(
        classesData.map(async (cls) => {
          try {
            const subjects = await getClassSubjects(cls.id)
            console.log(`Classes: ${subjects.length} matières chargées pour la classe ${cls.name}`)
            return { ...cls, subjects }
          } catch (error) {
            console.error(`Classes: Erreur lors du chargement des matières pour la classe ${cls.name}:`, error)
            // En cas d'erreur, retourner la classe sans matières plutôt que de faire échouer tout le chargement
            return { ...cls, subjects: [] }
          }
        })
      )
      
      // 3. Ajouter le nom de la classe à chaque étudiant
      const studentsWithClassNames = studentsData.map(student => {
        const studentClass = classesData.find(c => c.id === student.classId)
        return {
          ...student,
          className: studentClass?.name || ''
        }
      })
      
      // 4. Mettre à jour l'état
      setClasses(classesWithSubjects)
      setStudents(studentsWithClassNames)
      console.log('Classes: Données chargées avec succès')
      
    } catch (error) {
      console.error('Classes: Erreur critique lors du chargement des données:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données. Veuillez réessayer plus tard.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      console.log('Classes: Fin du chargement')
    }
  }

  const handleOpenDialog = (cls?: Class) => {
    setCurrentClass(cls || {})
    setIsDialogOpen(true)
  }

  const handleOpenSubjectDialog = (cls: Class) => {
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

  // Fonction pour supprimer toutes les matières d'une classe
  const deleteAllSubjectsForClass = async (classId: number) => {
    try {
      // Récupérer les matières existantes
      const subjects = await getClassSubjects(classId);
      // Supprimer chaque matière
      for (const subject of subjects) {
        await deleteClassSubject(subject.id);
      }
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression des matières de la classe:', error);
      return false;
    }
  };

  const handleSaveClass = async () => {
    if (!currentClass.name) {
      toast({
        title: "Erreur",
        description: "Le nom de la classe est requis.",
        variant: "destructive",
      })
      return
    }
    try {
      // Création uniquement, pas de modification
      const created = await createClass({ name: currentClass.name })
      const classId = created.id;
      toast({
        title: "Succès",
        description: "La classe a été créée avec succès.",
      })
      // Si des matières sont spécifiées, les ajouter
      if (currentClass.subjects && currentClass.subjects.length > 0) {
        for (const subject of currentClass.subjects) {
          try {
            await createSubject({
              name: subject.name,
              classId,
              coefficient: subject.coefficient,
              hoursPerWeek: subject.hoursPerWeek || 0
            });
          } catch (error) {
            console.error(`Erreur lors de l'ajout de la matière ${subject.name}:`, error);
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la création de la classe.",
        variant: "destructive",
      })
    } finally {
      handleCloseDialog()
      loadData()
    }
  }

  const handleSaveSubject = async () => {
    // Vérifier que tous les champs requis sont présents
    if (!currentSubject.name || !currentSubject.coefficient || !currentSubject.teacherId) {
      toast({
        title: "Erreur",
        description: "Tous les champs sont obligatoires, y compris la sélection d'un professeur.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createSubject({
        name: currentSubject.name || '',
        classId: currentClass.id || 0,
        coefficient: currentSubject.coefficient || 1,
        teacherId: currentSubject.teacherId,
        hoursPerWeek: currentSubject.hoursPerWeek || 0
      });
      
      toast({
        title: "Succès",
        description: "La matière a été ajoutée avec succès.",
      });
      
      handleCloseSubjectDialog();
      loadData();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: `Erreur lors de l'ajout de la matière: ${error}`,
        variant: "destructive",
      });
    }
  }

  const getStudentCount = (className: string) => {
    return students.filter(student => student.className === className).length
  }

  const getSubjectCount = (classId: number) => {
    return subjects.filter(subject => subject.classId === classId).length
  }

  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenDeleteDialog = (cls: Class) => {
    setCurrentClass(cls)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteClass = async () => {
    try {
      // Vérifier si la classe a des étudiants
      const studentCount = getStudentCount(currentClass.name || '')
      if (studentCount > 0) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer une classe qui contient des étudiants.",
          variant: "destructive",
        })
        return
      }

      await deleteClass(currentClass.id)
      toast({
        title: "Succès",
        description: "La classe a été supprimée avec succès.",
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setCurrentClass({})
      loadData()
    }
  }

  if (isLoading) {
    return <div>Chargement...</div>
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <BookOpen className="mr-2 h-6 w-6" />
            Gestion des Classes
          </h2>
          <Button onClick={() => handleOpenDialog()} className="bg-school-600 hover:bg-school-700">
            Ajouter une classe
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredClasses.map((cls) => (
              <Card key={cls.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-school-50 p-4">
                    <h3 className="font-bold text-lg">{cls.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getStudentCount(cls.name)} élèves
                    </p>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenSubjectDialog(cls)}
                      >
                        <BookOpen className="h-4 w-4 mr-1" /> Ajouter matière
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleOpenDeleteDialog(cls)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                      </Button>
                    </div>
                    {/* Affichage des matières de la classe */}
                    <div>
                      <h4 className="font-semibold text-base mb-1">Matières de la classe :</h4>
                      {(cls.subjects && cls.subjects.length > 0) ? (
                        <div className="grid grid-cols-1 gap-2">
                          {cls.subjects.map((subj, idx) => (
                            <div key={idx} className="rounded bg-blue-50 border px-3 py-2 flex items-center gap-4">
                              <span className="font-medium">{subj.name}</span>
                              <span className="text-xs">Coef: {subj.coefficient}</span>
                              {subj.teacherName && (
                                <span className="text-xs ml-auto">Prof: {subj.teacherName}</span>
                              )}
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
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle Classe</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom de la classe</Label>
                <Input
                  id="name"
                  value={currentClass.name || ''}
                  onChange={(e) => setCurrentClass({ ...currentClass, name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveClass}>Créer la classe</Button>
              <Button variant="outline" onClick={handleCloseDialog}>Annuler</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialogue d'ajout de matière pour une classe existante */}
        <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une matière à {currentClass.name}</DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle matière à cette classe et sélectionnez le professeur qui l'enseignera.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject-name">Nom de la matière</Label>
                <Input
                  id="subject-name"
                  value={currentSubject.name || ''}
                  onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
                  placeholder="Mathématiques"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="subject-coefficient">Coefficient</Label>
                <Input
                  id="subject-coefficient"
                  type="number"
                  min="1"
                  value={currentSubject.coefficient || ''}
                  onChange={(e) => setCurrentSubject({ ...currentSubject, coefficient: Number(e.target.value) })}
                  placeholder="Ex: 3"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject-hours">Heures par semaine</Label>
                <Input
                  id="subject-hours"
                  type="number"
                  min="1"
                  value={currentSubject.hoursPerWeek || ''}
                  onChange={(e) => setCurrentSubject({ ...currentSubject, hoursPerWeek: Number(e.target.value) })}
                  placeholder="Ex: 4"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="subject-teacher">Professeur</Label>
                {teachers.length === 0 ? (
                  <div className="text-sm text-red-500">
                    Aucun professeur disponible. Veuillez d'abord créer des professeurs avant d'ajouter des matières.
                  </div>
                ) : (
                  <Select
                    onValueChange={(value) => setCurrentSubject({ ...currentSubject, teacherId: Number(value) })}
                    value={currentSubject.teacherId ? String(currentSubject.teacherId) : undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un professeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={String(teacher.id)}>
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseSubjectDialog}>
                Annuler
              </Button>
              <Button 
                onClick={handleSaveSubject}
                disabled={!currentSubject.name || !currentSubject.coefficient || !currentSubject.teacherId || teachers.length === 0}
              >
                Ajouter la matière
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer la classe "{currentClass.name}" ?
                Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteClass}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
