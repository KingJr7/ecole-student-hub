
import { useState, useEffect } from "react";
import { getGrades, getStudents, addGrade, updateGrade, deleteGrade, getAvailableClasses, getClassResults } from "@/lib/db";
import { Grade, Student, ClassResult } from "@/types";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { FileText, Pencil, Trash2, Search, ListCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import GradeForm from "@/components/GradeForm";

const Grades = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRankingDialogOpen, setIsRankingDialogOpen] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<Partial<Grade>>({});
  const [gradeToDelete, setGradeToDelete] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("1er trimestre");
  const [useWeightedAverage, setUseWeightedAverage] = useState<boolean>(true);
  const [classResults, setClassResults] = useState<ClassResult[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setStudents(getStudents());
    setGrades(getGrades());
    setAvailableClasses(getAvailableClasses());
  }, []);

  // Filtrer les étudiants en fonction de la recherche et de la classe sélectionnée
  const filteredStudents = students.filter(student => {
    const nameMatches = (student.firstName.toLowerCase() + " " + student.lastName.toLowerCase())
      .includes(searchQuery.toLowerCase());
    const classMatches = selectedClass === "all" || student.className === selectedClass;
    return nameMatches && classMatches;
  });

  // Obtenir les IDs des étudiants filtrés
  const filteredStudentIds = filteredStudents.map(student => student.id);

  // Filtrer les notes en fonction des étudiants filtrés et de l'étudiant sélectionné
  const filteredGrades = grades.filter(grade => {
    const studentMatches = selectedStudent === "all" 
      ? filteredStudentIds.includes(grade.studentId) 
      : grade.studentId === parseInt(selectedStudent);
    return studentMatches;
  });

  const handleOpenAddDialog = () => {
    setCurrentGrade({ 
      date: new Date().toISOString().split('T')[0],
      score: 0,
      coefficient: 1,
      evaluationType: 'devoir',
      term: '1er trimestre',
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

  const handleSaveGrade = (gradeData: Omit<Grade, "id">) => {
    try {
      if (currentGrade.id) {
        // Update existing grade
        updateGrade(currentGrade.id, gradeData);
        toast({
          title: "Succès",
          description: "La note a été mise à jour avec succès.",
        });
      } else {
        // Add new grade
        addGrade(gradeData);
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

  const handleCalculateRanking = () => {
    if (selectedClass === "all") {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une classe pour calculer le classement.",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = getClassResults(
        selectedClass, 
        selectedTerm as '1er trimestre' | '2e trimestre' | '3e trimestre',
        useWeightedAverage
      );
      
      if (results.length === 0) {
        toast({
          title: "Information",
          description: "Aucun résultat trouvé pour cette classe et ce trimestre.",
        });
        return;
      }
      
      setClassResults(results);
      setIsRankingDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du calcul du classement.",
        variant: "destructive",
      });
    }
  };

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : "Étudiant inconnu";
  };

  const getStudentClass = (studentId: number): string => {
    const student = students.find((s) => s.id === studentId);
    return student ? student.className : "-";
  };

  const getScoreClass = (score: number): string => {
    if (score >= 16) return "text-green-600 font-medium";
    if (score >= 12) return "text-amber-600 font-medium";
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
          <Button onClick={handleOpenAddDialog} className="bg-school-600 hover:bg-school-700">
            Ajouter une note
          </Button>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom d'élève..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-44">
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
              >
                <SelectTrigger id="class-filter">
                  <SelectValue placeholder="Classe" />
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
            
            <div className="w-full sm:w-44">
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger id="student-filter">
                  <SelectValue placeholder="Élève" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les élèves</SelectItem>
                  {filteredStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClass !== "all" && (
              <Button 
                onClick={handleCalculateRanking}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ListCheck className="h-4 w-4" />
                Liste d'admission
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-medium">Élève</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Classe</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Matière</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Type</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Trimestre</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Coef.</th>
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
                        <td className="py-3 px-4 text-sm">{getStudentClass(grade.studentId)}</td>
                        <td className="py-3 px-4 text-sm">{grade.subject}</td>
                        <td className="py-3 px-4 text-sm">{grade.evaluationType || "-"}</td>
                        <td className="py-3 px-4 text-sm">{grade.term || "-"}</td>
                        <td className="py-3 px-4 text-sm">{grade.coefficient || 1}</td>
                        <td className="py-3 px-4">
                          <span className={`text-sm ${getScoreClass(grade.score)}`}>
                            {grade.score}/20
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
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        Aucune note enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Grade Form using GradeForm Component */}
        <GradeForm
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSaveGrade}
          students={students}
          initialData={currentGrade}
          isEdit={!!currentGrade.id}
        />

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

        {/* Class Ranking Dialog */}
        <Dialog open={isRankingDialogOpen} onOpenChange={setIsRankingDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Liste d'admission - {selectedClass}</DialogTitle>
              <DialogDescription>
                {selectedTerm} - Système de calcul: {useWeightedAverage ? "Moyenne pondérée" : "Moyenne simple"}
              </DialogDescription>
            </DialogHeader>

            <div className="mb-4 flex justify-end space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="termSelector">Trimestre:</Label>
                <Select
                  value={selectedTerm}
                  onValueChange={(value) => setSelectedTerm(value)}
                >
                  <SelectTrigger id="termSelector" className="w-[180px]">
                    <SelectValue placeholder="Sélectionner le trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1er trimestre">1er Trimestre</SelectItem>
                    <SelectItem value="2e trimestre">2e Trimestre</SelectItem>
                    <SelectItem value="3e trimestre">3e Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="averageType">Type de moyenne:</Label>
                <Select
                  value={useWeightedAverage ? "weighted" : "simple"}
                  onValueChange={(value) => setUseWeightedAverage(value === "weighted")}
                >
                  <SelectTrigger id="averageType" className="w-[180px]">
                    <SelectValue placeholder="Type de moyenne" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weighted">Moyenne pondérée</SelectItem>
                    <SelectItem value="simple">Moyenne simple</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCalculateRanking}>Recalculer</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rang</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Moyenne</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classResults.map((result) => (
                      <TableRow key={result.studentId}>
                        <TableCell className="font-medium">{result.rank}</TableCell>
                        <TableCell>{result.studentName}</TableCell>
                        <TableCell className={result.average >= 10 ? "text-green-600" : "text-red-600"}>
                          {result.average.toFixed(2)}/20
                        </TableCell>
                        <TableCell>
                          <span 
                            className={`px-2 py-1 rounded-md text-xs font-medium ${
                              result.status === 'admis' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {result.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsRankingDialogOpen(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Grades;
