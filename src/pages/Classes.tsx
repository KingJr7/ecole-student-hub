import { useState, useEffect } from 'react'
import { useDatabase } from '../hooks/useDatabase'
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
  coefficient: number
  classId: number
}

export default function Classes() {
  const { getAllClasses, getAllStudents, getAllSubjects, createClass, createSubject, updateClass, deleteClass } = useDatabase()
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
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
      const [classesData, studentsData] = await Promise.all([
        getAllClasses(),
        getAllStudents()
      ])
      
      // Ajouter le nom de la classe à chaque étudiant
      const studentsWithClassNames = studentsData.map(student => {
        const studentClass = classesData.find(c => c.id === student.classId)
        return {
          ...student,
          className: studentClass?.name || ''
        }
      })
      
      setClasses(classesData)
      setStudents(studentsWithClassNames)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement des données.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
      if (currentClass.id) {
        await updateClass(currentClass.id, { name: currentClass.name })
        toast({
          title: "Succès",
          description: "La classe a été mise à jour avec succès.",
        })
      } else {
        await createClass({ name: currentClass.name })
        toast({
          title: "Succès",
          description: "La classe a été créée avec succès.",
        })
      }
      handleCloseDialog()
      loadData()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      })
    }
  }

  const handleSaveSubject = async () => {
    try {
      await createSubject({
        name: currentSubject.name || '',
        classId: currentClass.id || 0,
        coefficient: currentSubject.coefficient || 1,
        teacherId: currentSubject.teacherId || 0
      })
      handleCloseSubjectDialog()
      loadData()
    } catch (error) {
      console.error(error)
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
    if (!currentClass.id) return

    try {
      // Vérifier s'il y a des étudiants dans la classe
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
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(cls)}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleOpenDeleteDialog(cls)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                      </Button>
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
              <DialogTitle>
                {currentClass.id ? 'Modifier la Classe' : 'Nouvelle Classe'}
              </DialogTitle>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Annuler
              </Button>
              <Button onClick={handleSaveClass}>
                {currentClass.id ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Ajouter une matière à {currentClass.name}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subjectName">Nom de la matière</Label>
                <Input
                  id="subjectName"
                  value={currentSubject.name || ''}
                  onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coefficient">Coefficient</Label>
                <Input
                  id="coefficient"
                  type="number"
                  min="1"
                  value={currentSubject.coefficient || 1}
                  onChange={(e) => setCurrentSubject({ ...currentSubject, coefficient: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseSubjectDialog}>
                Annuler
              </Button>
              <Button onClick={handleSaveSubject}>
                Ajouter
              </Button>
            </div>
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
