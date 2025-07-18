import { useState, useEffect } from "react";
import { useDatabase } from "../hooks/useDatabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import { useToast } from "@/components/ui/use-toast";

// Interfaces alignées sur le schéma et les données retournées par le backend
interface Attendance {
  id: number;
  student_id: number;
  date: string;
  state: string;
  justification?: string;
  // Champs ajoutés par le handler IPC
  firstName?: string;
  lastName?: string;
}

interface Student {
  id: number;
  name: string;
  first_name: string;
  registrations: { class: { id: number } }[];
}

interface Class {
  id: number;
  name: string;
}

const AttendancePage = () => {
  const { getAllAttendances, getAllStudents, getAllClasses, createAttendance, updateAttendance } = useDatabase();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState<Partial<Attendance>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const date = new Date(selectedDate);
      const year = date.getFullYear();
      const month = date.getMonth();
      const schoolYear = month < 8 ? `${year - 1}-${year}` : `${year}-${year + 1}`;

      const [attendancesData, studentsData, classesData] = await Promise.all([
        getAllAttendances({ date: selectedDate }),
        getAllStudents({ schoolYear }),
        getAllClasses(),
      ]);
      setAttendances(attendancesData || []);
      setStudents(studentsData || []);
      setClasses(classesData || []);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      toast({ variant: "destructive", description: 'Erreur lors du chargement des données' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleOpenDialog = (student: Student) => {
    const existingAttendance = getAttendanceForStudent(student.id);
    setCurrentAttendance(existingAttendance || {
      student_id: student.id,
      date: selectedDate,
      state: "present",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setCurrentAttendance({});
    setIsDialogOpen(false);
  };

  const handleSaveAttendance = async () => {
    if (!currentAttendance.student_id || !currentAttendance.date || !currentAttendance.state) {
      toast({ title: "Erreur", description: "Champs manquants.", variant: "destructive" });
      return;
    }

    try {
      if (currentAttendance.id) {
        await updateAttendance(currentAttendance.id, currentAttendance);
        toast({ description: "Présence mise à jour." });
      } else {
        await createAttendance(currentAttendance);
        toast({ description: "Présence enregistrée." });
      }
      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({ title: "Erreur", description: "La sauvegarde a échoué.", variant: "destructive" });
    }
  };

  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.first_name} ${student.name}` : "Étudiant inconnu";
  };

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      "present": "Présent",
      "absent": "Absent",
      "late": "En retard",
      "excused": "Excusé",
    };
    return statusMap[status] || status;
  };

  const getAttendanceForStudent = (studentId: number) => {
    return attendances.find(a => a.student_id === studentId && a.date === selectedDate);
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name || ''} ${student.name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    
    const studentClassId = student.registrations?.[0]?.class_id;
    const matchesClass = selectedClass === "all" || (studentClassId && studentClassId.toString() === selectedClass);

    const attendance = getAttendanceForStudent(student.id);
    const matchesStatus = selectedStatusFilter === "all" || 
                        (selectedStatusFilter === 'unregistered' && !attendance) || 
                        (attendance?.state === selectedStatusFilter);

    return matchesSearch && matchesClass && matchesStatus;
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <CalendarCheck className="mr-2 h-6 w-6" />
            Gestion des Présences
          </h2>
          <div className="flex items-center space-x-2">
            <Label htmlFor="date">Date:</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Input
            placeholder="Rechercher un étudiant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filtrer par classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="present">Présents</SelectItem>
              <SelectItem value="absent">Absents</SelectItem>
              <SelectItem value="late">En retard</SelectItem>
              <SelectItem value="excused">Excusés</SelectItem>
              <SelectItem value="unregistered">Non enregistré</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Étudiant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Justification</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => {
              const attendance = getAttendanceForStudent(student.id);
              return (
                <TableRow key={student.id}>
                  <TableCell>{getStudentName(student.id)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${attendance ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {attendance ? formatStatus(attendance.state) : "Non enregistré"}
                    </span>
                  </TableCell>
                  <TableCell>{attendance?.justification || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(student)}
                    >
                      {attendance ? "Modifier" : "Enregistrer"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer la présence</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Étudiant</Label>
                <Input
                  value={getStudentName(currentAttendance.student_id || 0)}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={currentAttendance.date || ""}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select
                  value={currentAttendance.state || ""}
                  onValueChange={(value) => setCurrentAttendance({ ...currentAttendance, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Présent</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">En retard</SelectItem>
                    <SelectItem value="excused">Excusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Justification (si absent)</Label>
                <Textarea
                  value={currentAttendance.justification || ""}
                  onChange={(e) => setCurrentAttendance({ ...currentAttendance, justification: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Annuler</Button>
              <Button onClick={handleSaveAttendance}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default AttendancePage;