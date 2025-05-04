
import { useState, useEffect } from "react";
import { getStudents, addStudent, updateStudent, deleteStudent } from "@/lib/db";
import { Student } from "@/types";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Users, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // In a real app, we would fetch this data from the backend
    setStudents(getStudents());
  }, []);

  const handleOpenAddDialog = () => {
    setCurrentStudent({});
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (student: Student) => {
    setCurrentStudent({ ...student });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (studentId: number) => {
    setStudentToDelete(studentId);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveStudent = () => {
    if (
      !currentStudent.firstName ||
      !currentStudent.lastName ||
      !currentStudent.email
    ) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (currentStudent.id) {
        // Update existing student
        updateStudent(currentStudent.id, currentStudent);
        toast({
          title: "Succès",
          description: "L'élève a été mis à jour avec succès.",
        });
      } else {
        // Add new student
        addStudent(currentStudent as Omit<Student, "id">);
        toast({
          title: "Succès",
          description: "L'élève a été ajouté avec succès.",
        });
      }

      // Refresh student list
      setStudents(getStudents());
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = () => {
    if (studentToDelete) {
      try {
        deleteStudent(studentToDelete);
        setStudents(getStudents());
        toast({
          title: "Succès",
          description: "L'élève a été supprimé avec succès.",
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression.",
          variant: "destructive",
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <Users className="mr-2 h-6 w-6" />
            Gestion des Élèves
          </h2>
          <Button onClick={handleOpenAddDialog} className="bg-school-600 hover:bg-school-700">
            Ajouter un élève
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {students.map((student) => (
            <Card key={student.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-school-50 p-4">
                  <h3 className="font-bold text-lg">
                    {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    ID: {student.id}
                  </p>
                </div>
                <div className="p-4 space-y-2">
                  <div>
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm ml-2">{student.email}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Téléphone:</span>
                    <span className="text-sm ml-2">{student.phone}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Inscrit le:</span>
                    <span className="text-sm ml-2">{student.enrollmentDate}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Statut:</span>
                    <span className={`text-sm ml-2 ${
                      student.status === "active" ? "text-green-600" : 
                      student.status === "inactive" ? "text-red-600" : 
                      "text-amber-600"
                    }`}>
                      {student.status === "active" ? "Actif" : 
                       student.status === "inactive" ? "Inactif" : 
                       "Diplômé"}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditDialog(student)}
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleOpenDeleteDialog(student.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add/Edit Student Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {currentStudent.id
                  ? "Modifier l'élève"
                  : "Ajouter un nouvel élève"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={currentStudent.firstName || ""}
                    onChange={(e) =>
                      setCurrentStudent({
                        ...currentStudent,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={currentStudent.lastName || ""}
                    onChange={(e) =>
                      setCurrentStudent({
                        ...currentStudent,
                        lastName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentStudent.email || ""}
                  onChange={(e) =>
                    setCurrentStudent({
                      ...currentStudent,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={currentStudent.phone || ""}
                  onChange={(e) =>
                    setCurrentStudent({
                      ...currentStudent,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date de naissance</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={currentStudent.dateOfBirth || ""}
                    onChange={(e) =>
                      setCurrentStudent({
                        ...currentStudent,
                        dateOfBirth: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enrollmentDate">Date d'inscription</Label>
                  <Input
                    id="enrollmentDate"
                    type="date"
                    value={currentStudent.enrollmentDate || ""}
                    onChange={(e) =>
                      setCurrentStudent({
                        ...currentStudent,
                        enrollmentDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={currentStudent.address || ""}
                  onChange={(e) =>
                    setCurrentStudent({
                      ...currentStudent,
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={currentStudent.status || "active"}
                  onValueChange={(value) =>
                    setCurrentStudent({
                      ...currentStudent,
                      status: value as "active" | "inactive" | "graduated",
                    })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Sélectionnez un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="graduated">Diplômé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveStudent}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </DialogHeader>
            <p>Êtes-vous sûr de vouloir supprimer cet élève? Cette action est irréversible.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteStudent}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Students;
