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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck, Pencil, Trash2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import StudentSearchSelect from "@/components/StudentSearchSelect";
import { useToast } from "@/components/ui/use-toast";

interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: string;
  notes?: string;
  supabase_id?: string;
  sqlite_id?: number;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  classId: string;
  supabase_id?: string;
  sqlite_id?: number;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}

interface Class {
  id: string;
  name: string;
  supabase_id?: string;
  sqlite_id?: number;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}

const Attendance = () => {
  const { getAllAttendances, getAllStudents, getAllClasses, createAttendance } = useDatabase();
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [attendancesData, studentsData, classesData] = await Promise.all([
        getAllAttendances(),
        getAllStudents(),
        getAllClasses()
      ]);
      setAttendances(attendancesData);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (error) {
      // useToast({ variant: "destructive", description: 'Erreur lors du chargement des données' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (student: Student) => {
    setCurrentAttendance({
      studentId: student.id,
      date: selectedDate,
      status: "present"
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setCurrentAttendance({});
    setIsDialogOpen(false);
  };

  const handleSaveAttendance = async () => {
    try {
      await createAttendance(currentAttendance as Required<Attendance>);
      // useToastToast({ description: "Présence enregistrée avec succès" });
      handleCloseDialog();
      loadData();
    } catch (error) {
      // useToastToast({ variant: "destructive", description: "Erreur lors de l'enregistrement de la présence" });
      console.error(error);
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : "Étudiant inconnu";
  };

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      "present": "Présent",
      "absent": "Absent",
      "late": "En retard",
      "excused": "Excusé"
    };
    return statusMap[status] || status;
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === "all" || student.classId === selectedClass;
    const attendance = attendances.find(a => a.studentId === student.id && a.date === selectedDate);
    let matchesStatus = true;
    if (selectedStatusFilter === "present") {
      matchesStatus = attendance?.status === "present";
    } else if (selectedStatusFilter === "absent") {
      matchesStatus = attendance?.status === "absent";
    }
    return matchesSearch && matchesClass && matchesStatus;
  });

  const getAttendanceForStudent = (studentId: string) => {
    return attendances.find(a => 
      a.studentId === studentId && 
      a.date === selectedDate
    );
  };

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
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="date">Date:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-school-600 hover:bg-school-700">
              Ajouter une présence
            </Button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Rechercher un étudiant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par présence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="present">Présents</SelectItem>
              <SelectItem value="absent">Absents</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Étudiant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => {
              const attendance = getAttendanceForStudent(student.id);
              return (
                <TableRow key={student.id}>
                  <TableCell>{getStudentName(student.id)}</TableCell>
                  <TableCell>
                    {attendance ? formatStatus(attendance.status) : "Non enregistré"}
                  </TableCell>
                  <TableCell>{attendance?.notes || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Enregistrer la présence
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Étudiant</Label>
                <Input
                  value={getStudentName(currentAttendance.studentId || "")}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={currentAttendance.date || ""}
                  onChange={(e) => setCurrentAttendance({ ...currentAttendance, date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select
                  value={currentAttendance.status}
                  onValueChange={(value) => setCurrentAttendance({ ...currentAttendance, status: value })}
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
                <Label>Notes</Label>
                <Textarea
                  value={currentAttendance.notes || ""}
                  onChange={(e) => setCurrentAttendance({ ...currentAttendance, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Annuler
              </Button>
              <Button onClick={handleSaveAttendance}>
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Attendance;
