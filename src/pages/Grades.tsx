import { useState, useEffect } from "react";
import { getGrades, getStudents, addGrade, updateGrade, deleteGrade, getAvailableClasses, getClassResults } from "@/lib/api";
import { Grade, Student, ClassResult } from "@/types";
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
import { FileText, Pencil, Trash2, Search, ListCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import GradeForm from "@/components/GradeForm";

const Grades = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<'1er trimestre' | '2e trimestre' | '3e trimestre'>('1er trimestre');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [gradeToDelete, setGradeToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classResults, setClassResults] = useState<ClassResult[]>([]);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const [gradesData, studentsData, classesData] = await Promise.all([
        getGrades(),
        getStudents(),
        getAvailableClasses()
      ]);
      setGrades(gradesData);
      setStudents(studentsData);
      setAvailableClasses(classesData);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredGrades = grades.filter((grade) => {
    const student = students.find((s) => s.id === grade.studentId);
    const nameMatches = student
      ? `${student.firstName} ${student.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : false;
    const classMatches =
      selectedClass === "all" || student?.className === selectedClass;
    return nameMatches && classMatches;
  });

  const handleDeleteGrade = async () => {
    if (gradeToDelete) {
      try {
        await deleteGrade(gradeToDelete);
        await loadData();
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

  const handleGenerateResults = async () => {
    if (selectedClass === "all") {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une classe pour générer les résultats.",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = await getClassResults(selectedClass, selectedTerm);
      setClassResults(results);
      setIsResultsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer les résultats de la classe.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <FileText className="mr-2 h-6 w-6" />
            Gestion des Notes
          </h2>
          <div className="flex space-x-4">
            {selectedClass !== "all" && (
              <div className="flex space-x-4">
                <Select value={selectedTerm} onValueChange={(value: '1er trimestre' | '2e trimestre' | '3e trimestre') => setSelectedTerm(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner le trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1er trimestre">1er trimestre</SelectItem>
                    <SelectItem value="2e trimestre">2e trimestre</SelectItem>
                    <SelectItem value="3e trimestre">3e trimestre</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleGenerateResults}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ListCheck className="mr-2 h-4 w-4" />
                  Générer la liste d'admission
                </Button>
              </div>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-school-600 hover:bg-school-700">
              Ajouter une note
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom d'élève..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {availableClasses.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Coefficient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Commentaire</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrades.length > 0 ? (
                    filteredGrades.map((grade) => (
                      <TableRow key={grade.id}>
                        <TableCell>{getStudentName(grade.studentId)}</TableCell>
                        <TableCell>{grade.subject}</TableCell>
                        <TableCell>{grade.score}</TableCell>
                        <TableCell>{grade.coefficient}</TableCell>
                        <TableCell>{grade.evaluationType === 'devoir' ? 'Devoir' : 'Composition'}</TableCell>
                        <TableCell>{grade.date}</TableCell>
                        <TableCell>{grade.notes || "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              // TODO: Implement edit functionality
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => {
                              setGradeToDelete(grade.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Aucune note trouvée
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une note</DialogTitle>
            </DialogHeader>
            <GradeForm
              isOpen={isAddDialogOpen}
              onClose={() => setIsAddDialogOpen(false)}
              onSave={async (grade) => {
                try {
                  await addGrade(grade);
                  await loadData();
                  setIsAddDialogOpen(false);
                  toast({
                    title: "Succès",
                    description: "La note a été ajoutée avec succès.",
                  });
                } catch (error) {
                  toast({
                    title: "Erreur",
                    description: "Une erreur est survenue lors de l'ajout de la note.",
                    variant: "destructive",
                  });
                }
              }}
              students={students}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
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

        <Dialog open={isResultsDialogOpen} onOpenChange={setIsResultsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Liste d'admission - {selectedClass} ({selectedTerm})</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rang</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead>Moyenne</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Détails des matières</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classResults.map((result) => (
                    <TableRow key={result.studentId}>
                      <TableCell>{result.rank}</TableCell>
                      <TableCell>{result.studentName}</TableCell>
                      <TableCell>{result.average.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.status === 'admis' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.status === 'admis' ? 'Admis' : 'Échec'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {Object.entries(result.subjects).map(([subject, { average, coefficient }]) => (
                            <div key={subject} className="text-sm">
                              <span className="font-medium">{subject}:</span>{' '}
                              <span className="text-gray-600">
                                {average.toFixed(2)} (coef. {coefficient})
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Grades;
