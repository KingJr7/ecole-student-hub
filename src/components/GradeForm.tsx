import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Grade, Student, Subject } from "@/types";
import StudentSearchSelect from "./StudentSearchSelect";
import { useDatabase } from "@/hooks/useDatabase";

interface GradeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (grade: Omit<Grade, "id">) => void;
  students: Student[];
  initialData?: Partial<Grade>;
  isEdit?: boolean;
}

const GradeForm = ({
  isOpen,
  onClose,
  onSave,
  students,
  initialData = {},
  isEdit = false
}: GradeFormProps) => {
  const [formData, setFormData] = useState<any>(initialData);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { toast } = useToast();
  const { getClassSubjects, getAllSubjects, getAllClasses } = useDatabase();

  // Charger les matières disponibles dynamiquement selon l'élève sélectionné
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        if (selectedStudent && selectedStudent.classId) {
          // On récupère les matières de la classe avec leur id
          const classSubjects = await getClassSubjects(selectedStudent.classId);
          setSubjects(classSubjects);
        } else {
          // Sinon, charge toutes les matières
          const allSubjects = await getAllSubjects();
          setSubjects(allSubjects);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des matières:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la liste des matières",
          variant: "destructive",
        });
      }
    };
    loadSubjects();
  }, [selectedStudent, toast, getClassSubjects, getAllSubjects]);

  // Mettre à jour l'étudiant sélectionné lorsque studentId change
  useEffect(() => {
    if (formData.studentId) {
      const student = students.find(s => s.id === formData.studentId) || null;
      setSelectedStudent(student);
    } else {
      setSelectedStudent(null);
    }
  }, [formData.studentId, students]);

  const handleStudentChange = (studentId: number) => {
    setFormData({
      ...formData,
      studentId,
      subject: undefined,
      coefficient: 1,
      score: undefined // Réinitialiser le score lors du changement d'étudiant
    });
  };

  const handleSubjectChange = (subjectId: string) => {
    const selectedSubject = subjects.find(s => s.id === parseInt(subjectId));
    if (selectedSubject) {
      setFormData({
        ...formData,
        subjectId: selectedSubject.id,
        coefficient: selectedSubject.coefficient
      });
    }
  };

  const handleSubmit = () => {
    if (
      !formData.studentId ||
      !formData.subjectId ||
      formData.score === undefined || formData.score === null ||
      formData.score < 0 || 
      formData.score > 20 ||
      !formData.date ||
      !formData.evaluationType ||
      !formData.term ||
      !formData.coefficient
    ) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires correctement.",
        variant: "destructive",
      });
      return;
    }

    // Adapter le champ pour la base (score → value)
    const subjectObj = subjects.find(s => s.id === formData.subjectId);
    const payload = {
      studentId: formData.studentId,
      subjectId: formData.subjectId,
      subject: subjectObj ? subjectObj.name : '',
      score: formData.score,
      value: formData.score,
      coefficient: formData.coefficient,
      date: formData.date,
      evaluationType: formData.evaluationType,
      term: formData.term,
      notes: formData.notes,
    };
    onSave(payload as Omit<Grade, "id">);
    onClose();
  };

  // Obtenir le nom d'affichage pour la matière sélectionnée
  const getSubjectDisplayName = (subjectName: string): string => {
    const subject = subjects.find(s => s.name === subjectName);
    return subject ? `${subject.name} (coef. ${subject.coefficient})` : subjectName;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        {/* DEBUG: Affichage temporaire pour diagnostiquer la correspondance des matières */}
        <div style={{background: '#ffe', color: '#a00', padding: 8, marginBottom: 8, fontSize: 12}}>
          <div><b>DEBUG subjects:</b> {JSON.stringify(subjects)}</div>
          <div><b>DEBUG formData.subjectId:</b> {JSON.stringify(formData.subjectId)}</div>
        </div>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la note" : "Ajouter une note"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifiez les informations de la note."
              : "Remplissez le formulaire pour ajouter une nouvelle note."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">Élève</Label>
            <StudentSearchSelect
              students={students}
              value={formData.studentId}
              onValueChange={handleStudentChange}
              placeholder="Rechercher un élève..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Matière</Label>
            <Select
              value={formData.subjectId ? formData.subjectId.toString() : undefined}
              onValueChange={handleSubjectChange}
              disabled={!selectedStudent}
            >
              <SelectTrigger id="subject">
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name} (coef. {subject.coefficient})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="placeholder" disabled>
                    {selectedStudent 
                      ? "Aucune matière disponible pour cette classe" 
                      : "Veuillez d'abord sélectionner un élève"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {!selectedStudent && (
              <p className="text-sm text-muted-foreground">
                Veuillez d'abord sélectionner un élève pour voir les matières disponibles
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score">Note (sur 20)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="20"
                step="0.25"
                value={formData.score?.toString() || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    score: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coefficient">Coefficient</Label>
              <Input
                id="coefficient"
                type="number"
                min="1"
                max="10"
                step="1"
                value={formData.coefficient?.toString() || "1"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    coefficient: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="evaluationType">Type d'évaluation</Label>
              <Select
                value={formData.evaluationType || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    evaluationType: value as "devoir" | "composition",
                  })
                }
              >
                <SelectTrigger id="evaluationType">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="devoir">Devoir</SelectItem>
                  <SelectItem value="composition">Composition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Trimestre</Label>
              <Select
                value={formData.term || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    term: value as "1er trimestre" | "2e trimestre" | "3e trimestre",
                  })
                }
              >
                <SelectTrigger id="term">
                  <SelectValue placeholder="Sélectionner le trimestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1er trimestre">1er trimestre</SelectItem>
                  <SelectItem value="2e trimestre">2e trimestre</SelectItem>
                  <SelectItem value="3e trimestre">3e trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  date: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value,
                })
              }
              placeholder="Ajouter des commentaires supplémentaires..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {isEdit ? "Mettre à jour" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradeForm;
