
import { useState } from "react";
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
import { Grade, Student } from "@/types";
import StudentSearchSelect from "./StudentSearchSelect";

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
  const [formData, setFormData] = useState<Partial<Grade>>(initialData);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (
      !formData.studentId ||
      !formData.subject ||
      !formData.score ||
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

    onSave(formData as Omit<Grade, "id">);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la note" : "Ajouter une note"}
          </DialogTitle>
          <DialogDescription>
            Entrez les détails de la note de l'élève ci-dessous.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">Élève</Label>
            <StudentSearchSelect
              students={students}
              value={formData.studentId}
              onValueChange={(studentId) =>
                setFormData({
                  ...formData,
                  studentId,
                })
              }
              placeholder="Rechercher un élève..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Matière</Label>
            <Input
              id="subject"
              value={formData.subject || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subject: e.target.value,
                })
              }
            />
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
