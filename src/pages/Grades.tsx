
import { useState, useEffect } from "react";
import { getGrades, getStudents, addGrade, updateGrade, deleteGrade } from "@/lib/db";
import { Grade, Student } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Grades = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<Partial<Grade>>({});
  const [gradeToDelete, setGradeToDelete] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    setStudents(getStudents());
    setGrades(getGrades());
  }, []);

  const filteredGrades = selectedStudent === "all"
    ? grades
    : grades.filter(grade => grade.studentId === parseInt(selectedStudent));

  const handleOpenAddDialog = () => {
    setCurrentGrade({ 
      date: new Date().toISOString().split('T')[0],
      score: 0,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (grade: Grade) => {
    setCurrentGrade({ ...grade });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (gradeId: number) => {
    setGradeToDelete(gradeId);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveGrade = () => {
    if (!currentGrade.studentId || !currentGrade.subject || !currentGrade.date || currentGrade.score === undefined) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    if (currentGrade.score < 0 || currentGrade.score > 100) {
      toast({
        title: "Erreur",
        description: "La note doit être comprise entre 0 et 100.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (currentGrade.id) {
        // Update existing grade
        updateGrade(currentGrade.id, currentGrade);
        toast({
          title: "Succès",
          description: "La note a été mise à jour avec succès.",
        });
      } else {
        // Add new grade
        addGrade(currentGrade as Omit<Grade, "id">);
        toast({
          title: "Succès",
          description: "La note a été ajoutée avec succès.",
        });
      }

      // Refresh grade list
      setGrades(getGrades());
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGrade = () => {
    if (gradeToDelete) {
      try {
        deleteGrade(gradeToDelete);
        setGrades(getGrades());
        toast({
          title: "Succès",
          description: "La note a été supprimée avec succès.",
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
    setGradeToDelete(null);
  };

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : "Étudiant inconnu";
  };

  const getScoreClass = (score: number): string => {
    if (score >= 80) return "text-green-600 font-medium";
    if (score >= 60) return "text-amber-600 font-medium";
    return "text-red-600 font-medium";
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <FileText className="mr-2 h-6 w-6" />
            Gestion des Notes
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="student-filter">Élève:</Label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger id="student-filter" className="w-[200px]">
                  <SelectValue placeholder="Filtrer par élève" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les élèves</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleOpenAddDialog} className="bg-school-600 hover:bg-school-700">
              Ajouter une note
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-medium">Élève</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Matière</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Note</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Date</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Notes</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrades.length > 0 ? (
                    filteredGrades.map((grade) => (
                      <tr key={grade.id} className="border-t">
                        <td className="py-3 px-4 text-sm">{getStudentName(grade.studentId)}</td>
                        <td className="py-3 px-4 text-sm">{grade.subject}</td>
                        <td className="py-3 px-4">
                          <span className={`text-sm ${getScoreClass(grade.score)}`}>
                            {grade.score}/100
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{grade.date}</td>
                        <td className="py-3 px-4 text-sm">{grade.notes || "-"}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditDialog(grade)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleOpenDeleteDialog(grade.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Aucune note enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Grade Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {currentGrade.id ? "Modifier la note" : "Ajouter une note"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="student">Élève</Label>
                <Select
                  value={currentGrade.studentId?.toString() || ""}
                  onValueChange={(value) =>
                    setCurrentGrade({
                      ...currentGrade,
                      studentId: Number(value),
                    })
                  }
                >
                  <SelectTrigger id="student">
                    <SelectValue placeholder="Sélectionnez un élève" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Matière</Label>
                <Input
                  id="subject"
                  value={currentGrade.subject || ""}
                  onChange={(e) =>
                    setCurrentGrade({
                      ...currentGrade,
                      subject: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="score">Note (sur 100)</Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    value={currentGrade.score?.toString() || ""}
                    onChange={(e) =>
                      setCurrentGrade({
                        ...currentGrade,
                        score: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={currentGrade.date || ""}
                    onChange={(e) =>
                      setCurrentGrade({
                        ...currentGrade,
                        date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={currentGrade.notes || ""}
                  onChange={(e) =>
                    setCurrentGrade({
                      ...currentGrade,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveGrade}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </DialogHeader>
            <p>Êtes-vous sûr de vouloir supprimer cette note? Cette action est irréversible.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteGrade}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Grades;
