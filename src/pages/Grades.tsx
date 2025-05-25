import { useState, useEffect, useRef } from "react";
import { Grade, Student, ClassResult, SubjectGrade, StudentBulletin, Teacher } from "@/types";
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
import jsPDF from "jspdf";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Pencil, Trash2, Search, ListCheck, Printer, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import GradeForm from "@/components/GradeForm";
import { useDatabase } from "@/hooks/useDatabase";

const Grades = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<'1er trimestre' | '2e trimestre' | '3e trimestre'>('1er trimestre');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [gradeToDelete, setGradeToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classResults, setClassResults] = useState<ClassResult[]>([]);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
  const [isBulletinsDialogOpen, setIsBulletinsDialogOpen] = useState(false);
  const [bulletinsReady, setBulletinsReady] = useState(false);
  const [generatingBulletins, setGeneratingBulletins] = useState(false);
  const [studentBulletins, setStudentBulletins] = useState<StudentBulletin[]>([]);
  const [schoolName, setSchoolName] = useState<string>("");
  const bulletinsContainerRef = useRef<HTMLDivElement>(null);
  const { toast: useToastToast } = useToast();

  const { 
    getAllGrades, 
    getAllStudents, 
    getAllClasses,
    getAllSubjects,
    getAllTeachers,
    createGrade,
    deleteGrade,
    getClassResults,
    getSettings
  } = useDatabase();

  const loadData = async () => {
    try {
      const [gradesData, studentsData, classesData, subjectsData, teachersData] = await Promise.all([
        getAllGrades(),
        getAllStudents(),
        getAllClasses(),
        getAllSubjects(),
        getAllTeachers()
      ]);
      setGrades(gradesData);
      setStudents(studentsData);
      setClasses(classesData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      useToastToast({ variant: "destructive", description: 'Erreur lors du chargement des données' });
    }
  };

  useEffect(() => {
    loadData();
    
    // Charger le nom de l'école depuis les paramètres
    getSettings()
      .then(settings => {
        setSchoolName(settings?.schoolName || "École Ntik");
      })
      .catch(error => {
        console.error('Erreur lors de la récupération des paramètres:', error);
        setSchoolName("École Ntik"); // Valeur par défaut
      });
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
    const termMatches = grade.term === selectedTerm;
    return nameMatches && classMatches && termMatches;
  });

  const handleDeleteGrade = async () => {
    if (gradeToDelete) {
      try {
        await deleteGrade(gradeToDelete);
        await loadData();
        useToastToast({ description: 'Note supprimée avec succès' });
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        useToastToast({ variant: "destructive", description: 'Erreur lors de la suppression' });
      }
    }
    setIsDeleteDialogOpen(false);
    setGradeToDelete(null);
  };

  // Fonction pour générer le PDF de la liste d'admission
  const generatePDF = async () => {
    try {
      // Récupérer le nom de l'école depuis les paramètres
      const settings = await getSettings();
      const schoolName = settings?.schoolName || 'Ntik';
      
      const doc = new jsPDF();
      
      // Ajouter un en-tête stylisé avec le nom de l'école
      // Background rectangulaire pour l'en-tête
      doc.setFillColor(0, 113, 188); // Bleu école
      doc.rect(0, 0, 210, 30, 'F');
      
      // Nom de l'école en blanc
      doc.setTextColor(255, 255, 255); // Texte blanc
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(schoolName.toUpperCase(), 105, 15, { align: 'center' });
      
      // Titre de la liste en blanc
      doc.setFontSize(14);
      doc.text(`LISTE D'ADMISSION - ${selectedClass.toUpperCase()} (${selectedTerm.toUpperCase()})`, 105, 25, { align: 'center' });
      
      // Réinitialiser les couleurs pour le contenu
      doc.setTextColor(0, 0, 0);
      
      // Entête du tableau
      const headers = ['Rang', 'Élève', 'Moyenne', 'Statut'];
      let y = 40;
      
      // Dessiner les en-têtes
      doc.setFont('helvetica', 'bold');
      doc.text(headers[0], 20, y);
      doc.text(headers[1], 40, y);
      doc.text(headers[2], 140, y);
      doc.text(headers[3], 170, y);
      
      // Ligne de séparation
      y += 5;
      doc.line(20, y, 190, y);
      y += 5;
      
      // Contenu du tableau
      doc.setFont('helvetica', 'normal');
      classResults.forEach((result) => {
        doc.text(result.rank.toString(), 20, y);
        doc.text(result.studentName, 40, y);
        doc.text(result.average.toFixed(2), 140, y);
        doc.text(result.status === 'admis' ? 'Admis' : 'Échec', 170, y);
        y += 8;
        
        // Ajouter une nouvelle page si nécessaire
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });
      
      // Ajouter un pied de page avec logo Ntik
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Ntik - Système de gestion scolaire - Page ${i} sur ${pageCount}`, 105, 290, { align: 'center' });
      }
      
      // Enregistrer le PDF
      doc.save(`liste_admission_${selectedClass}_${selectedTerm.replace(/ /g, '_')}.pdf`);
      
      useToastToast({ description: 'PDF généré avec succès' });
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      useToastToast({ variant: "destructive", description: 'Erreur lors de la génération du PDF' });
    }
  };

  // Fonctions utilitaires
  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : 'Inconnu';
  };

  // Déterminer l'appréciation en fonction de la note
  const getAppreciation = (note: number) => {
    if (note >= 18) return "Excellent";
    if (note >= 16) return "Très bien";
    if (note >= 14) return "Bien";
    if (note >= 12) return "Assez bien";
    if (note >= 10) return "Passable";
    if (note >= 8) return "Médiocre";
    if (note >= 5) return "Insuffisant";
    return "Très insuffisant";
  };

  // Récupérer le nom du professeur qui enseigne la matière
  const getTeacherName = (subjectId: number) => {
    // Rechercher la matière par son ID
    const subject = subjects.find(s => s.id === subjectId);
    
    if (!subject) {
      return 'Non assigné';
    }
    
    // Si la matière a un professeur assigné directement (teacherName)
    if (subject.teacherName && subject.teacherName !== '') {
      return subject.teacherName;
    }
    
    // Si la matière a un ID de professeur
    if (subject.teacherId) {
      // Rechercher le professeur par son ID
      const teacher = teachers.find(t => t.id === subject.teacherId);
      if (teacher) {
        return `${teacher.firstName} ${teacher.lastName}`;
      }
      return `Professeur ${subject.teacherId}`;
    }
    
    return 'Non assigné';
  };

  const handleGenerateResults = async () => {
    if (selectedClass === "all") {
      useToastToast({ variant: "destructive", description: 'Veuillez sélectionner une classe spécifique' });
      return;
    }

    try {
      const results = await getClassResults(selectedClass, selectedTerm);
      setClassResults(results);
      setIsResultsDialogOpen(true);
    } catch (error) {
      console.error('Erreur lors de la génération des résultats:', error);
      useToastToast({ variant: "destructive", description: 'Erreur lors de la génération des résultats' });
    }
  };
  
  // Fonction pour générer les bulletins individuels des élèves
  const handleGenerateBulletins = async () => {
    if (selectedClass === "all") {
      useToastToast({ variant: "destructive", description: 'Veuillez sélectionner une classe spécifique' });
      return;
    }
    
    setGeneratingBulletins(true);
    setBulletinsReady(false);
    
    try {
      // Obtenir les élèves de la classe sélectionnée
      const classStudents = students.filter(student => student.className === selectedClass);
      
      // Pour chaque élève, préparer les données de son bulletin
      const bulletinsData = await Promise.all(classStudents.map(async (student) => {
        // Récupérer toutes les notes de l'élève pour le trimestre sélectionné
        const studentGrades = grades.filter(grade => 
          grade.studentId === student.id && 
          grade.term === selectedTerm
        );
        
        // Grouper les notes par matière
        const subjectGrades = studentGrades.reduce((acc, grade) => {
          // Récupérer les informations de la matière à partir de l'ID de la matière
          const subjectInfo = subjects.find(s => s.id === grade.subjectId);
          
          // Si aucune matière trouvée avec cet ID, utiliser le nom de la matière dans la note
          const subjectName = subjectInfo?.name || grade.subject || 'Inconnue';
          const coefficient = subjectInfo?.coefficient || 1;
          
          if (!acc[subjectName]) {
            acc[subjectName] = {
              coefficient,
              devoirs: [],
              compositions: [],
              average: 0,
              subjectId: grade.subjectId || 0
            };
          }
          
          if (grade.evaluationType === 'devoir') {
            acc[subjectName].devoirs.push(grade);
          } else {
            acc[subjectName].compositions.push(grade);
          }
          
          // On s'assure que les notes sont triées de la plus récente à la plus ancienne
          if (acc[subjectName].devoirs.length > 1) {
            acc[subjectName].devoirs.sort((a, b) => {
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
          }
          
          if (acc[subjectName].compositions.length > 1) {
            acc[subjectName].compositions.sort((a, b) => {
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
          }
          
          return acc;
        }, {} as Record<string, { coefficient: number, devoirs: Grade[], compositions: Grade[], average: number, subjectId: number }>);
        
        // Calculer les moyennes par matière
        let totalWeightedAverage = 0;
        let totalCoefficient = 0;
      
      Object.keys(subjectGrades).forEach(subjectName => {
        const subject = subjectGrades[subjectName];
        
        // Fusionner toutes les notes (devoirs et compositions)
        const allGrades = [...subject.devoirs, ...subject.compositions];
        
        // Calculer directement la moyenne pondérée par les coefficients des notes
        if (allGrades.length > 0) {
          let totalWeightedGrades = 0;
          let totalGradeCoefficients = 0;
          
          allGrades.forEach(grade => {
            // Le coefficient de chaque note (généralement 1, sauf si spécifié autrement)
            const noteCoefficient = grade.coefficient || 1;
            totalWeightedGrades += grade.value * noteCoefficient;
            totalGradeCoefficients += noteCoefficient;
          });
          
          subject.average = totalGradeCoefficients > 0 ? totalWeightedGrades / totalGradeCoefficients : 0;
        } else {
          subject.average = 0;
        }
        
        totalWeightedAverage += subject.average * subject.coefficient;
        totalCoefficient += subject.coefficient;
        });
        
        // Calcul de la moyenne générale
        const generalAverage = totalCoefficient > 0 ? 
          totalWeightedAverage / totalCoefficient : 
          0;
        
        return {
          student,
          subjectGrades,
          generalAverage,
          term: selectedTerm,
          className: selectedClass
        };
      }));
      
      // Calculer le rang et le statut d'admission pour chaque élève
      // Trier les bulletins par moyenne générale décroissante
      const sortedBulletins = [...bulletinsData].sort((a, b) => b.generalAverage - a.generalAverage);
      
      // Attribuer un rang à chaque élève
      const bulletins: StudentBulletin[] = sortedBulletins.map((bulletin, index) => {
        const rank = index + 1;
        const isAdmitted = bulletin.generalAverage >= 10;
        return {
          ...bulletin,
          rank,
          isAdmitted
        };
      });
      
      setStudentBulletins(bulletins);
      setBulletinsReady(true);
      setIsBulletinsDialogOpen(true);
    } catch (error) {
      console.error('Erreur lors de la génération des bulletins:', error);
      useToastToast({ variant: "destructive", description: 'Erreur lors de la génération des bulletins' });
    } finally {
      setGeneratingBulletins(false);
    }
  };
  
  // Fonction pour imprimer tous les bulletins
  const handlePrintAllBulletins = () => {
    if (!bulletinsContainerRef.current) return;

    // Récupérer le contenu du conteneur des bulletins
    const originalTitle = document.title;
    const allContent = bulletinsContainerRef.current.innerHTML;

    // CSS pour l'impression
    const printStyles = `
      @page { size: A4; margin: 1cm; }
      body { font-family: Arial, sans-serif; }
      .bulletin { page-break-after: always; margin-bottom: 30px; padding: 15px; }
      .bulletin:last-child { page-break-after: avoid; }
      table { border-collapse: collapse; width: 100%; margin: 15px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      .header { text-align: center; margin-bottom: 20px; }
      .school-info { text-align: center; margin-bottom: 15px; }
      .student-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
      @media print {
        .student-info { flex-direction: row !important; }
        .student-info > div { display: flex !important; flex-direction: row !important; }
      }
      .grades-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .grades-table th, .grades-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .grades-table th { background-color: #f0f0f0; }
      .summary { margin-top: 20px; font-weight: bold; text-align: center; padding: 10px; }
    `;
    
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      useToastToast({ variant: "destructive", description: 'Impossible d\'ouvrir une fenêtre d\'impression. Vérifiez les bloqueurs de popups.' });
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulletins de Notes - ${selectedClass} - ${selectedTerm}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${printStyles}</style>
        </head>
        <body>
          ${allContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Attendre que le contenu soit chargé avant d'imprimer
    setTimeout(() => {
      printWindow.print();
      // Ne ferme pas la fenêtre pour permettre à l'utilisateur de sauvegarder
    }, 500);
    
    // Restaurer le titre original
    document.title = originalTitle;
  };
  
  // Fonction pour télécharger tous les bulletins en PDF
  const downloadAllBulletinsAsPDF = () => {
    if (!bulletinsReady) return;
    
    const doc = new jsPDF();
    doc.setFontSize(16);
    
    studentBulletins.forEach((bulletin, index) => {
      if (index > 0) doc.addPage();
      
      const { student, subjectGrades, generalAverage, className, term, rank, isAdmitted } = bulletin;
      
      // En-tête du bulletin
      doc.setFillColor(0, 113, 188);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`BULLETIN DE NOTES`, 105, 12, { align: 'center' });
      
      // Informations de l'école et du trimestre
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`École: ${schoolName || 'Ntik'}`, 105, 30, { align: 'center' });
      doc.text(`Classe: ${className} - ${term}`, 105, 38, { align: 'center' });
      
      // Informations de l'élève
      doc.setFontSize(10);
      doc.text(`Élève: ${student.firstName} ${student.lastName}`, 20, 50);
      doc.text(`Rang: ${rank} sur ${studentBulletins.length}`, 20, 58);
      doc.text(`Moyenne Générale: ${generalAverage.toFixed(2)}/20`, 150, 50);
      
      // Statut d'admission
      if (isAdmitted) {
        doc.setFillColor(0, 150, 0); // Vert pour admis
        doc.rect(150, 55, 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('ADMIS', 165, 60, { align: 'center' });
      } else {
        doc.setFillColor(220, 0, 0); // Rouge pour échec
        doc.rect(150, 55, 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('ÉCHEC', 165, 60, { align: 'center' });
      }
      doc.setTextColor(0, 0, 0); // Réinitialiser la couleur du texte
      
      // Définir les marges pour le tableau des notes
      const marginLeft = 20;
      const marginRight = 20;
      const tableWidth = 210 - marginLeft - marginRight;
      
      // Tableau des notes par matière
      doc.setFontSize(8);
      
      // En-têtes du tableau
      let yPos = 60;
      doc.setFillColor(240, 240, 240);
      doc.rect(marginLeft, yPos, tableWidth, 7, 'F');
      doc.text('Matière', marginLeft + 2, yPos + 5);
      doc.text('Professeur', marginLeft + 40, yPos + 5);
      doc.text('Devoirs', marginLeft + 70, yPos + 5);
      doc.text('Compositions', marginLeft + 100, yPos + 5);
      doc.text('Moyenne', marginLeft + 130, yPos + 5);
      doc.text('Appréciation', marginLeft + 150, yPos + 5);
      
      yPos += 10;
      
      // Contenu du tableau
      Object.entries(subjectGrades).forEach(([subjectName, data]) => {
        // Vérifier s'il reste de la place sur la page, sinon ajouter une nouvelle page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        // Nom de la matière
        doc.text(subjectName, marginLeft + 2, yPos);
        
        // Nom du professeur
        const teacherName = getTeacherName((data as SubjectGrade).subjectId);
        doc.text(teacherName, marginLeft + 40, yPos);
        
        // Notes des devoirs - assurer le tri par date (plus récentes d'abord)
        const sortedDevoirs = [...(data as SubjectGrade).devoirs].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const devoirsText = sortedDevoirs.map(d => d.value.toFixed(1)).join(', ');
        // Afficher les notes des devoirs
        doc.text(sortedDevoirs.length > 0 ? devoirsText : '-', marginLeft + 70, yPos);
        
        // Récupérer les commentaires des devoirs
        const devoirsComments = sortedDevoirs.map(d => d.notes || '').filter(note => note !== '').join('; ');
        
        // Notes des compositions - assurer le tri par date (plus récentes d'abord)
        const sortedCompositions = [...(data as SubjectGrade).compositions].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const compositionsText = sortedCompositions.map(c => c.value.toFixed(1)).join(', ');
        // Afficher les notes des compositions
        doc.text(sortedCompositions.length > 0 ? compositionsText : '-', marginLeft + 100, yPos);
        
        // Récupérer les commentaires des compositions
        const compositionsComments = sortedCompositions.map(c => c.notes || '').filter(note => note !== '').join('; ');
        
        // Moyenne de la matière
        doc.text((data as SubjectGrade).average.toFixed(2), marginLeft + 130, yPos);
        
        // Appréciation
        doc.text(getAppreciation((data as SubjectGrade).average), marginLeft + 150, yPos);
        
        // Si des commentaires existent, les ajouter en petit sous la ligne principale
        const allComments = [devoirsComments, compositionsComments].filter(c => c !== '').join(' | ');
        if (allComments) {
          const originalFontSize = doc.getFontSize();
          doc.setFontSize(6); // Taille plus petite pour les commentaires
          doc.text(`Commentaires: ${allComments}`, marginLeft + 2, yPos + 3, { maxWidth: tableWidth - 4 });
          doc.setFontSize(originalFontSize); // Remettre la taille d'origine
          yPos += 5; // Espace supplémentaire si des commentaires sont affichés
        }
        
        yPos += 8;
      });
      
      // Pied de page avec la moyenne générale
      doc.setFontSize(10);
      doc.setFillColor(0, 113, 188);
      doc.rect(marginLeft, yPos + 5, tableWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`Moyenne Générale: ${generalAverage.toFixed(2)}/20`, 105, yPos + 12, { align: 'center' });
    });
    
    doc.save(`Bulletins_${selectedClass}_${selectedTerm.replace(/\s/g, '_')}.pdf`);
    
    useToastToast({
      description: `${studentBulletins.length} bulletins ont été téléchargés en PDF.`
    });
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
            
            {selectedClass !== "all" && (
              <div className="flex space-x-4">
                <Button 
                  onClick={handleGenerateResults}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ListCheck className="mr-2 h-4 w-4" />
                  Générer la liste d'admission
                </Button>
                <Button 
                  onClick={handleGenerateBulletins}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={generatingBulletins}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {generatingBulletins ? 'Génération...' : 'Bulletins individuels'}
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
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.name}>
                    {cls.name}
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
                        <TableCell>{(() => {
                          const subject = subjects.find((s: any) => s.id === grade.subjectId);
                          return subject ? subject.name || subject.subjectName : 'Matière inconnue';
                        })()}</TableCell>
                        <TableCell>{grade.value}</TableCell>
                        <TableCell>{(() => {
                          const subject = subjects.find((s: any) => s.id === grade.subjectId);
                          return subject ? subject.coefficient : '';
                        })()}</TableCell>
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
                  await createGrade(grade);
                  await loadData();
                  setIsAddDialogOpen(false);
                  useToastToast({description: 'Note créée avec succès'});
                } catch (error) {
                  useToastToast({description: 'Erreur lors de la sauvegarde de la note'});
                  console.error(error);
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
              <div className="flex justify-end mt-2">
                <Button 
                  onClick={() => generatePDF()} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="mr-2 h-4 w-4" /> Télécharger PDF
                </Button>
              </div>
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
                          {Object.entries(result.subjects).map(([subjectKey, { average, coefficient }]) => {
                            // Tenter de trouver le vrai nom de la matière si subjectKey est un id ou code
                            let subjectName = subjectKey;
                            // Chercher dans la classe courante
                            const classObj = classes.find(cls => cls.name === selectedClass);
                            if (classObj && classObj.subjects) {
                              const found = classObj.subjects.find(
                                (s: any) => s.subjectName === subjectKey || s.name === subjectKey || s.id?.toString() === subjectKey
                              );
                              if (found) subjectName = found.subjectName || found.name;
                            }
                            return (
                              <div key={subjectKey} className="text-sm">
                                <span className="font-medium">{subjectName}:</span>{' '}
                                <span className="text-gray-600">
                                  {average.toFixed(2)} (coef. {coefficient})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialogue des bulletins individuels */}
        <Dialog open={isBulletinsDialogOpen} onOpenChange={setIsBulletinsDialogOpen} modal={false}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bulletins individuels - {selectedClass} ({selectedTerm})</DialogTitle>
              <div className="flex justify-end mt-2 space-x-2">
                <Button 
                  onClick={handlePrintAllBulletins}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!bulletinsReady}
                >
                  <Printer className="mr-2 h-4 w-4" /> Imprimer tous
                </Button>
                <Button 
                  onClick={downloadAllBulletinsAsPDF} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!bulletinsReady}
                >
                  <Download className="mr-2 h-4 w-4" /> Télécharger PDF
                </Button>
              </div>
            </DialogHeader>
            
            {generatingBulletins && (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                <span className="ml-3">Génération des bulletins en cours...</span>
              </div>
            )}
            
            <div ref={bulletinsContainerRef}>
              {bulletinsReady && studentBulletins.map((bulletin, index) => (
                <div key={bulletin.student.id} className="bulletin border rounded-lg p-4 mb-8 print:mb-0 print:p-4">
                  <div className="header bg-school-600 text-white p-3 rounded-t-lg">
                    <h3 className="text-xl font-bold text-center">BULLETIN DE NOTES</h3>
                  </div>
                  
                  <div className="school-info mt-4 text-center">
                    <h4 className="font-bold text-lg">{schoolName || 'Ntik'}</h4>
                    <p>Classe: {bulletin.className} - {bulletin.term}</p>
                  </div>
                  
                  <div className="student-info mt-6 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-3 rounded">
                    <div className="flex flex-col sm:flex-row sm:space-x-6 mb-2 sm:mb-0">
                      <div>
                        <p><span className="font-semibold">Élève:</span> {bulletin.student.firstName} {bulletin.student.lastName}</p>
                      </div>
                      <div>
                        <p><span className="font-semibold">Rang:</span> <span className="font-bold">{bulletin.rank}</span> sur {studentBulletins.length}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                      <div>
                        <p><span className="font-semibold">Moyenne Générale:</span> <span className="text-lg font-bold">{bulletin.generalAverage.toFixed(2)}/20</span></p>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${bulletin.isAdmitted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {bulletin.isAdmitted ? 'Admis' : 'Échec'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mx-2 my-6 overflow-x-auto">
                    <table className="grades-table w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left border border-gray-200">Matière</th>
                        <th className="p-2 text-center border border-gray-200">Professeur</th>
                        <th className="p-2 text-center border border-gray-200">Coefficient</th>
                        <th className="p-2 text-left border border-gray-200">Devoirs</th>
                        <th className="p-2 text-left border border-gray-200">Compositions</th>
                        <th className="p-2 text-center border border-gray-200">Moyenne</th>
                        <th className="p-2 text-center border border-gray-200">Appréciation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(bulletin.subjectGrades).map(([subjectName, data]) => {
                        const subjectData = data as SubjectGrade;
                        // Récupérer les commentaires des devoirs et compositions
                        const devoirsComments = subjectData.devoirs.map(d => d.notes || '').filter(note => note !== '').join('; ');
                        const compositionsComments = subjectData.compositions.map(c => c.notes || '').filter(note => note !== '').join('; ');
                        
                        return (
                          <tr key={subjectData.subjectId} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium border border-gray-200">{subjectName}</td>
                            <td className="p-2 text-center border border-gray-200">{getTeacherName(subjectData.subjectId)}</td>
                            <td className="p-2 text-center border border-gray-200">{subjectData.coefficient}</td>
                            <td className="p-2 border border-gray-200">
                              <div>
                                {subjectData.devoirs.length > 0 
                                  ? subjectData.devoirs.map(d => d.value.toFixed(1)).join(', ')
                                  : '-'}
                              </div>
                              {devoirsComments && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {devoirsComments}
                                </div>
                              )}
                            </td>
                            <td className="p-2 border border-gray-200">
                              <div>
                                {subjectData.compositions.length > 0 
                                  ? subjectData.compositions.map(c => c.value.toFixed(1)).join(', ')
                                  : '-'}
                              </div>
                              {compositionsComments && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {compositionsComments}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-center font-semibold border border-gray-200">{subjectData.average.toFixed(2)}</td>
                            <td className="p-2 text-center border border-gray-200">{getAppreciation(subjectData.average)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  
                  <div className="summary mt-6 bg-school-600 text-white p-3 rounded text-center mx-2">
                    <p className="font-bold text-lg">Moyenne Générale: {bulletin.generalAverage.toFixed(2)}/20</p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Grades;
