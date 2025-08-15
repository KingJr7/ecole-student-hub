import { useState, useEffect, useRef } from "react";
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
import { FileText, Pencil, Trash2, Search, ListCheck, Printer, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useDatabase } from "@/hooks/useDatabase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Interfaces alignées sur Prisma
interface Student { id: number; name: string; first_name: string; }
interface Class { id: number; name: string; level: string; }
interface Subject { id: number; name: string; coefficient: number; }
interface Lesson { id: number; class_id: number; subject_id: number; subject: Subject; }
interface Note {
  id: number;
  student_id: number;
  lesson_id: number;
  value: number;
  type: string;
  quarter: number;
  student: Student;
  lesson: Lesson;
}
interface ClassResult {
  studentId: number;
  studentName: string;
  average: number;
  rank: number;
  status: string;
  subjects: { [subjectName: string]: { average: number; coefficient: number; } };
}

const Grades = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classResults, setClassResults] = useState<ClassResult[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isBulletinsOpen, setIsBulletinsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("Mon École");

  const { toast } = useToast();
  const db = useDatabase();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [notesData, studentsData, classesData, lessonsData, settingsData] = await Promise.all([
          db.getAllNotes(),
          db.getAllStudents(),
          db.getAllClasses(),
          db.getAllLessons(),
          db.getSettings(),
        ]);
        setNotes(notesData || []);
        setStudents(studentsData || []);
        setClasses(classesData || []);
        setLessons(lessonsData || []);
        setSchoolName(settingsData?.schoolName || "Mon École");
        if (classesData && classesData.length > 0) {
          setSelectedClassId(classesData[0].id);
        }
      } catch (error) {
        console.error("Erreur de chargement:", error);
        toast({ variant: "destructive", description: "Le chargement des données a échoué." });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSaveNote = async () => {
    if (!currentNote.student_id || !currentNote.lesson_id || currentNote.value === undefined) {
      toast({ variant: "destructive", description: "Veuillez remplir tous les champs." });
      return;
    }
    const dataToSave = { ...currentNote, quarter: selectedQuarter };

    try {
      if (dataToSave.id) {
        await db.updateNote(dataToSave.id, dataToSave);
        toast({ description: "Note mise à jour." });
      } else {
        await db.createNote(dataToSave);
        toast({ description: "Note créée." });
      }
      setIsFormOpen(false);
      setCurrentNote({});
      // Recharger uniquement les notes pour la performance
      db.getAllNotes().then(setNotes);
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
      toast({ variant: "destructive", description: "La sauvegarde a échoué." });
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await db.deleteNote(noteToDelete);
      toast({ description: "Note supprimée." });
      setIsDeleteOpen(false);
      setNoteToDelete(null);
      db.getAllNotes().then(setNotes);
    } catch (error) {
      console.error("Erreur de suppression:", error);
      toast({ variant: "destructive", description: "La suppression a échoué." });
    }
  };

  const handleGenerateResults = async () => {
    if (!selectedClassId) {
      toast({ variant: "destructive", description: "Veuillez sélectionner une classe." });
      return;
    }
    try {
      const results = await db.getClassResults(selectedClassId, selectedQuarter);
      setClassResults(results || []);
      setIsResultsOpen(true);
    } catch (error) {
      console.error("Erreur de génération des résultats:", error);
      toast({ variant: "destructive", description: "La génération des résultats a échoué." });
    }
  };

  const downloadResultsPDF = () => {
    const doc = new jsPDF();
    const selectedClass = classes.find(c => c.id === selectedClassId);
    doc.text(`Liste d'admission - ${selectedClass?.name} - Trimestre ${selectedQuarter}`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['Rang', 'Nom', 'Moyenne', 'Statut']],
      body: classResults.map(r => [r.rank, r.studentName, r.average.toFixed(2), r.status]),
    });
    
    doc.save(`resultats_${selectedClass?.name}_T${selectedQuarter}.pdf`);
  };

  const downloadBulletinsPDF = () => {
    const doc = new jsPDF();
    const selectedClass = classes.find(c => c.id === selectedClassId);

    classResults.forEach((result, index) => {
      if (index > 0) doc.addPage();
      doc.setFontSize(16);
      doc.text(`${schoolName}`, 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Bulletin de notes - Trimestre ${selectedQuarter}`, 105, 22, { align: 'center' });
      doc.text(`Classe: ${selectedClass?.name || ''}`, 105, 29, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Élève: ${result.studentName}`, 14, 40);
      doc.text(`Moyenne: ${result.average.toFixed(2)}/20`, 14, 46);
      doc.text(`Rang: ${result.rank}/${classResults.length}`, 14, 52);
      doc.text(`Décision: ${result.status}`, 14, 58);

      autoTable(doc, {
        startY: 65,
        head: [['Matière', 'Coefficient', 'Moyenne']],
        body: Object.entries(result.subjects).map(([name, { coefficient, average }]) => [
          name,
          coefficient,
          average.toFixed(2)
        ]),
      });
    });

    doc.save(`bulletins_${selectedClass?.name}_T${selectedQuarter}.pdf`);
  };

  const filteredNotes = notes.filter(note => {
    const studentName = `${note.student.first_name} ${note.student.name}`.toLowerCase();
    const lesson = lessons.find(l => l.id === note.lesson_id);
    return (
      studentName.includes(searchQuery.toLowerCase()) &&
      (selectedClassId ? lesson?.class_id === selectedClassId : true) &&
      note.quarter === selectedQuarter
    );
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800"><FileText className="mr-2" />Gestion des Notes</h2>
          <Button onClick={() => { setCurrentNote({ quarter: selectedQuarter }); setIsFormOpen(true); }}>Ajouter une note</Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <Input placeholder="Rechercher par nom..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
          <Select onValueChange={(val) => setSelectedClassId(Number(val))} value={String(selectedClassId)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Classe" /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={(val) => setSelectedQuarter(Number(val))} value={String(selectedQuarter)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Trimestre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Trimestre 1</SelectItem>
              <SelectItem value="2">Trimestre 2</SelectItem>
              <SelectItem value="3">Trimestre 3</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateResults} variant="secondary"><ListCheck className="mr-2 h-4 w-4" />Générer Résultats</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Étudiant</TableHead><TableHead>Matière</TableHead><TableHead>Note</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center">Chargement...</TableCell></TableRow> : 
                filteredNotes.map(note => (
                  <TableRow key={note.id}>
                    <TableCell>{`${note.student.first_name} ${note.student.name}`}</TableCell>
                    <TableCell>{note.lesson.subject.name}</TableCell>
                    <TableCell>{note.value}</TableCell>
                    <TableCell>{note.type}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentNote(note); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setNoteToDelete(note.id); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{currentNote.id ? "Modifier" : "Ajouter"} une note</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <Select onValueChange={(val) => setCurrentNote(p => ({ ...p, student_id: Number(val) }))} value={String(currentNote.student_id || '')}>
                <SelectTrigger><SelectValue placeholder="Étudiant" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={String(s.id)}>{`${s.first_name} ${s.name}`}</SelectItem>)}</SelectContent>
              </Select>
              <Select onValueChange={(val) => setCurrentNote(p => ({ ...p, lesson_id: Number(val) }))} value={String(currentNote.lesson_id || '')}>
                <SelectTrigger><SelectValue placeholder="Leçon (Matière)" /></SelectTrigger>
                <SelectContent>{lessons.filter(l => l.class_id === selectedClassId).map(l => <SelectItem key={l.id} value={String(l.id)}>{l.subject.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Note" value={currentNote.value || ''} onChange={e => setCurrentNote(p => ({ ...p, value: parseFloat(e.target.value) }))} />
              <Select onValueChange={(val) => setCurrentNote(p => ({ ...p, type: val }))} value={currentNote.type || ''}>
                <SelectTrigger><SelectValue placeholder="Type de note" /></SelectTrigger>
                <SelectContent><SelectItem value="devoir">Devoir</SelectItem><SelectItem value="composition">Composition</SelectItem></SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveNote}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
                <DialogDescription>Voulez-vous vraiment supprimer cette note ?</DialogDescription>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
                    <Button variant="destructive" onClick={handleDeleteNote}>Supprimer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Results Dialog */}
        <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Résultats - {classes.find(c=>c.id === selectedClassId)?.name} - Trimestre {selectedQuarter}</DialogTitle></DialogHeader>
                <div className="flex gap-2 mt-4">
                    <Button onClick={downloadResultsPDF}><Download className="mr-2 h-4 w-4" />Liste d'admission</Button>
                    <Button onClick={downloadBulletinsPDF}><Download className="mr-2 h-4 w-4" />Bulletins</Button>
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

      </div>
    </MainLayout>
  );
};

export default Grades;