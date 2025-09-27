import React, { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getAccessLevel, PERMISSIONS } from "@/lib/permissions";
import { useDatabase } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListCheck, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Interfaces
interface Student { id: number; name: string; first_name: string; registrations?: { class_id: number }[] }
interface Class { id: number; name: string; }
interface Lesson { id: number; class_id: number; subject: { name: string }; }
interface ClassResult {
  studentId: number;
  studentName: string;
  studentPicture: string | null;
  studentMatricul: string | null;
  average: number;
  rank: number;
  status: string;
  subjects: { 
    [subjectName: string]: { 
      average: number | null; 
      coefficient: number; 
      notes: { type: string; value: number | null; }[];
    } 
  };
}

const GradeEntryForm = ({ selectedClassId, selectedQuarter, lessons, students, db, toast, isReadOnly }) => {
  const [notes, setNotes] = useState<Record<number, number | null>>({}); // studentId -> value
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("Devoir 1");
  const [isSaving, setIsSaving] = useState(false);

  const filteredLessons = useMemo(() => {
    if (!selectedClassId) return [];
    return lessons.filter(l => l.class_id === parseInt(selectedClassId, 10));
  }, [lessons, selectedClassId]);

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => 
      s.registrations?.some(r => r.class_id === parseInt(selectedClassId, 10))
    );
  }, [students, selectedClassId]);

  useEffect(() => {
    if (filteredLessons.length > 0) {
      setSelectedLessonId(filteredLessons[0].id.toString());
    } else {
      setSelectedLessonId("");
    }
  }, [filteredLessons]);

  useEffect(() => {
    const fetchNotes = async () => {
      if (!selectedLessonId || !selectedQuarter || !selectedType) {
        setNotes({});
        return;
      }
      try {
        const allNotes = await db.getAllNotes(); 
        const relevantNotes = allNotes.filter(n => 
          n.lesson_id === parseInt(selectedLessonId, 10) &&
          n.quarter === parseInt(selectedQuarter, 10) &&
          n.type === selectedType
        );
        const notesMap = relevantNotes.reduce((acc, note) => {
          acc[note.student_id] = note.value;
          return acc;
        }, {} as Record<number, number | null>);
        setNotes(notesMap);
      } catch (error) {
        console.error("Erreur chargement des notes:", error);
      }
    };
    fetchNotes();
  }, [selectedLessonId, selectedQuarter, selectedType, db]);

  const handleNoteChange = (studentId: number, value: string) => {
    const numericValue = value === '' ? null : parseFloat(value);
    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0 || numericValue > 20)) return;
    setNotes(prev => ({ ...prev, [studentId]: numericValue }));
  };

  const handleSaveGrades = async () => {
    if (!selectedLessonId || !selectedType || !selectedQuarter) {
      toast({ variant: "destructive", description: "Veuillez sélectionner une matière, un type et un trimestre." });
      return;
    }
    setIsSaving(true);
    try {
      const gradesToSave = Object.entries(notes)
        .map(([student_id, value]) => ({ student_id: parseInt(student_id, 10), value }))
        .filter(g => g.value !== null);

      if (gradesToSave.length === 0) {
        toast({ description: "Aucune note à enregistrer." });
        setIsSaving(false);
        return;
      }

      await db.createManyNotes({
        lesson_id: parseInt(selectedLessonId, 10),
        type: selectedType,
        quarter: parseInt(selectedQuarter, 10),
        grades: gradesToSave,
      });

      toast({ description: `${gradesToSave.length} note(s) enregistrée(s) avec succès.` });
    } catch (error) {
      console.error("Erreur de sauvegarde des notes:", error);
      toast({ variant: "destructive", description: "La sauvegarde a échoué." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saisie des notes en masse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select onValueChange={setSelectedLessonId} value={selectedLessonId} disabled={!selectedClassId}>
            <SelectTrigger><SelectValue placeholder="Choisir une matière..." /></SelectTrigger>
            <SelectContent>{filteredLessons.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.subject.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select onValueChange={setSelectedType} value={selectedType}>
            <SelectTrigger><SelectValue placeholder="Type de note" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Devoir 1">Devoir 1</SelectItem>
              <SelectItem value="Devoir 2">Devoir 2</SelectItem>
              <SelectItem value="Composition">Composition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[50vh] overflow-y-auto border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[60%]">Nom de l'élève</TableHead>
                <TableHead className="w-[40%]">Note / 20</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 && selectedLessonId ? (
                filteredStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{`${student.first_name} ${student.name}`}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={notes[student.id] ?? ''}
                        onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        className="w-24"
                        disabled={isReadOnly}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center h-24">
                    Veuillez sélectionner une classe et une matière pour afficher la liste des élèves.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveGrades} disabled={isSaving || filteredStudents.length === 0 || isReadOnly}>
            {isSaving ? "Enregistrement..." : "Enregistrer les notes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const Grades = () => {
  const { user } = useAuth();
  const accessLevel = getAccessLevel(user?.role, user?.permissions, PERMISSIONS.CAN_MANAGE_GRADES);
  const isReadOnly = accessLevel === 'read_only';

  const db = useDatabase();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classResults, setClassResults] = useState<ClassResult[]>([]);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [classesData, lessonsData, studentsData, settingsData, logoData] = await Promise.all([
          db.getAllClasses(),
          db.getAllLessons(),
          db.getAllStudents(),
          db.getSettings(),
          db.getSchoolLogoBase64(),
        ]);
        setClasses(classesData || []);
        setLessons(lessonsData || []);
        setStudents(studentsData || []);
        setSettings(settingsData);
        setSchoolLogo(logoData);
        if (classesData?.length > 0) {
          setSelectedClassId(classesData[0].id.toString());
        }
      } catch (error) {
        console.error("Erreur de chargement:", error);
        toast({ variant: "destructive", description: "Le chargement des données a échoué." });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [db, toast]);

  const handleGenerateResults = async () => {
    if (!selectedClassId) {
      toast({ variant: "destructive", description: "Veuillez sélectionner une classe." });
      return;
    }
    try {
      const results = await db.getClassResults(parseInt(selectedClassId, 10), parseInt(selectedQuarter, 10));
      setClassResults(results || []);
      setIsResultsOpen(true);
    } catch (error) {
      console.error("Erreur de génération des résultats:", error);
      toast({ variant: "destructive", description: "La génération des résultats a échoué." });
    }
  };

  const downloadResultsPDF = () => {
    const doc = new jsPDF();
    const selectedClass = classes.find(c => c.id === parseInt(selectedClassId, 10));
    const schoolName = settings?.schoolName || "Mon École";
    const schoolAddress = settings?.schoolAddress || "Adresse de l'école";
    const directorTitle = settings?.directorGender === 'female' ? 'La Directrice' : 'Le Directeur';
    const directorName = settings?.directorName || "";

    // --- HEADER ---
    if (schoolLogo) {
      doc.addImage(schoolLogo, 'WEBP', 14, 10, 25, 25);
    } else {
      doc.setFillColor(240, 240, 240);
      doc.rect(14, 10, 25, 25, 'F');
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text("Logo", 26.5, 24, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(schoolAddress, 105, 24, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`LISTE D'ADMISSION - ${selectedClass?.name || ''} - TRIMESTRE ${selectedQuarter}`, 105, 35, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);

    // --- TABLE ---
    const head = [['Rang', 'Matricule', 'Nom & Prénoms', 'Moyenne / 20', 'Décision']];
    const body = classResults.map(r => [
      r.rank,
      r.studentMatricul || '-',
      r.studentName,
      r.average.toFixed(2),
      r.status
    ]);

    autoTable(doc, {
      startY: 45,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'Admis') {
            data.cell.styles.textColor = [0, 128, 0]; // Green
          } else {
            data.cell.styles.textColor = [255, 0, 0]; // Red
          }
        }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 20;

    // --- FOOTER ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(directorTitle, 105, finalY, { align: 'center' });
    doc.setFont("helvetica", "bold");
    doc.text(directorName, 105, finalY + 5, { align: 'center' });

    doc.save(`resultats_${selectedClass?.name}_T${selectedQuarter}.pdf`);
  };

  const downloadBulletinsPDF = async () => {
    const doc = new jsPDF();
    const selectedClass = classes.find(c => c.id === parseInt(selectedClassId, 10));
    const schoolName = settings?.schoolName || "Mon École";
    const schoolAddress = settings?.schoolAddress || "Adresse de l'école";
    const directorTitle = settings?.directorGender === 'female' ? 'La Directrice' : 'Le Directeur';
    const directorName = settings?.directorName || "";

    for (const [index, result] of classResults.entries()) {
      if (index > 0) doc.addPage();

      // --- HEADER ---
      if (schoolLogo) {
        doc.addImage(schoolLogo, 'WEBP', 14, 10, 25, 25);
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 10, 25, 25, 'F');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(10);
        doc.text("Logo", 26.5, 24, { align: 'center' });
      }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(schoolName, 105, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(schoolAddress, 105, 24, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`BULLETIN DE NOTES - TRIMESTRE ${selectedQuarter}`, 105, 35, { align: 'center' });
      doc.setLineWidth(0.5);
      doc.line(14, 40, 196, 40);

      // --- STUDENT INFO & PHOTO ---
      if (result.studentPicture) {
        try {
          const base64Image = await db.getBase64Image(result.studentPicture);
          if (base64Image) {
            doc.addImage(base64Image, 'WEBP', 165, 45, 30, 35);
          }
        } catch (e) {
          console.error("Failed to load student image for PDF", e);
        }
      }
      
      // Draw placeholder if no image was added
      if (!result.studentPicture) { // Or check if addImage was successful if possible
          doc.setFillColor(240, 240, 240);
          doc.rect(165, 45, 30, 35, 'F');
          doc.setTextColor(150, 150, 150);
          doc.text("Photo", 180, 63, { align: 'center' });
      }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Élève:", 14, 50);
      doc.text("Classe:", 14, 57);
      doc.text("Matricule:", 14, 64);
      doc.setFont("helvetica", "normal");
      doc.text(result.studentName, 40, 50);
      doc.text(selectedClass?.name || '', 40, 57);
      doc.text(result.studentMatricul || 'N/A', 40, 64);

      // --- GRADES TABLE ---
      const head = [['Matière', 'Devoir 1', 'Devoir 2', 'Compo', 'Moyenne', 'Coef.']];
      const body = Object.entries(result.subjects).map(([name, { coefficient, average, notes }]) => {
        const devoir1 = notes.find(n => n.type === 'Devoir 1')?.value?.toFixed(2) || '-';
        const devoir2 = notes.find(n => n.type === 'Devoir 2')?.value?.toFixed(2) || '-';
        const compo = notes.find(n => n.type === 'Composition')?.value?.toFixed(2) || '-';
        
        return [
          name,
          devoir1,
          devoir2,
          compo,
          { content: average !== null ? average.toFixed(2) : '-', styles: { fontStyle: 'bold' } },
          coefficient,
        ];
      });

      autoTable(doc, {
        startY: 85,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold' },
          5: { halign: 'center' },
        },
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;

      // --- SUMMARY & FOOTER ---
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RÉSUMÉ DU TRIMESTRE", 14, finalY);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      autoTable(doc, {
        startY: finalY + 2,
        body: [
          ["Moyenne Générale", `${result.average.toFixed(2)}/20`],
          ["Rang", `${result.rank} / ${classResults.length}`],
          ["Appréciation du conseil", { content: "", styles: { minCellHeight: 20 } }],
          ["Décision du conseil", `${result.status}`],
        ],
        theme: 'grid',
        styles: { fontStyle: 'bold' },
      });

      finalY = (doc as any).lastAutoTable.finalY + 20;

      doc.setFontSize(10);
      doc.text("Signature des Parents", 30, finalY, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.text(directorTitle, 160, finalY, { align: 'center' });
      doc.setFont("helvetica", "bold");
      doc.text(directorName, 160, finalY + 5, { align: 'center' });
    }
    doc.save(`bulletins_${selectedClass?.name}_T${selectedQuarter}.pdf`);
  };

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-extrabold tracking-tight">Gestion des Notes</h2>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Select onValueChange={setSelectedClassId} value={selectedClassId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Classe" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select onValueChange={setSelectedQuarter} value={selectedQuarter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Trimestre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Trimestre 1</SelectItem>
              <SelectItem value="2">Trimestre 2</SelectItem>
              <SelectItem value="3">Trimestre 3</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateResults} variant="secondary" disabled={!selectedClassId || loading}><ListCheck className="mr-2 h-4 w-4" />Générer les Résultats</Button>
        </div>

        {loading ? <Skeleton className="h-96 w-full" /> : <GradeEntryForm isReadOnly={isReadOnly} selectedClassId={selectedClassId} selectedQuarter={selectedQuarter} classes={classes} lessons={lessons} students={students} db={db} toast={toast} />}
      </div>

      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Résultats - {classes.find(c=> c.id === parseInt(selectedClassId, 10))?.name} - Trimestre {selectedQuarter}</DialogTitle></DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button onClick={downloadResultsPDF}><Download className="mr-2 h-4 w-4" />Liste d'admission</Button>
            <Button onClick={downloadBulletinsPDF}><Download className="mr-2 h-4 w-4" />Bulletins individuels</Button>
          </div>
          <div className="mt-4 max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Rang</TableHead><TableHead>Nom</TableHead><TableHead>Moyenne</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {classResults.map(r => (
                  <TableRow key={r.studentId}>
                    <TableCell>{r.rank}</TableCell>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell>{r.average.toFixed(2)}</TableCell>
                    <TableCell>{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Grades;