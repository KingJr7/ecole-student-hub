import { useState, useEffect } from "react";
import { useDatabase } from "../hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, UserCheck, UserX, Clock, HelpCircle } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Interfaces
interface Attendance { id: number; student_id: number; date: string; state: string; }
interface Student { id: number; name: string; first_name: string; registrations: { class_id: number }[]; }
interface Class { id: number; name: string; }

const AttendancePage = () => {
  const { getAllAttendances, getAllStudents, getAllClasses, createAttendance, updateAttendance } = useDatabase();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const classesData = await getAllClasses();
        setClasses(classesData || []);
      } catch (error) {
        toast({ variant: "destructive", description: 'Erreur lors du chargement des classes.' });
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadClassData = async () => {
      if (!selectedClassId) {
        setStudents([]);
        setAttendances([]);
        return;
      }
      setIsLoadingStudents(true);
      try {
        const [studentsData, attendancesData] = await Promise.all([
          getAllStudents(),
          getAllAttendances({ date: selectedDate }),
        ]);
        const studentsInClass = studentsData.filter(s => s.registrations[0]?.class_id.toString() === selectedClassId);
        setStudents(studentsInClass);
        setAttendances(attendancesData || []);
      } catch (error) {
        toast({ variant: "destructive", description: 'Erreur lors du chargement des données de la classe.' });
      } finally {
        setIsLoadingStudents(false);
      }
    };
    loadClassData();
  }, [selectedClassId, selectedDate]);

  const handleSetAttendance = async (studentId: number, newState: string) => {
    const existingAttendance = attendances.find(a => a.student_id === studentId);
    const attendanceData = { student_id: studentId, date: selectedDate, state: newState };

    try {
      if (existingAttendance) {
        await updateAttendance(existingAttendance.id, attendanceData);
      } else {
        await createAttendance(attendanceData);
      }
      const attendancesData = await getAllAttendances({ date: selectedDate });
      setAttendances(attendancesData || []);
    } catch (error) {
      toast({ title: "Erreur", description: "La mise à jour a échoué.", variant: "destructive" });
    }
  };

  const getStatusProps = (studentId: number) => {
    const attendance = attendances.find(a => a.student_id === studentId);
    if (!attendance) return { text: "Non Pointé", icon: <HelpCircle className="h-5 w-5 text-gray-500" />, color: "border-gray-200", variant: "outline" };
    switch (attendance.state) {
      case 'present': return { text: "Présent", icon: <UserCheck className="h-5 w-5 text-green-600" />, color: "border-green-500 bg-green-50", variant: "default" };
      case 'absent': return { text: "Absent", icon: <UserX className="h-5 w-5 text-red-600" />, color: "border-red-500 bg-red-50", variant: "destructive" };
      case 'late': return { text: "En Retard", icon: <Clock className="h-5 w-5 text-yellow-600" />, color: "border-yellow-500 bg-yellow-50", variant: "secondary" };
      default: return { text: "Non Pointé", icon: <HelpCircle className="h-5 w-5 text-gray-500" />, color: "border-gray-200", variant: "outline" };
    }
  };

  const RowSkeleton = () => (
    <div className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
        <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
        </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Feuille de Présence
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="date">Date:</Label>
              <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
            </div>
            <Select onValueChange={setSelectedClassId} value={selectedClassId || ''}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner une classe"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedClassId ? (
          <Card>
            <CardContent className="p-4 space-y-2">
              {isLoadingStudents ? (
                [...Array(10)].map((_, i) => <RowSkeleton key={i} />)
              ) : (
                students.map((student) => {
                  const status = getStatusProps(student.id);
                  return (
                    <div key={student.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all ${status.color}`}>
                      <div className="flex items-center gap-3">
                        {status.icon}
                        <span className="font-medium">{student.first_name} {student.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant={status.text === 'Présent' ? 'default' : 'outline'} onClick={() => handleSetAttendance(student.id, 'present')}>Présent</Button>
                        <Button size="sm" variant={status.text === 'Absent' ? 'destructive' : 'outline'} onClick={() => handleSetAttendance(student.id, 'absent')}>Absent</Button>
                        <Button size="sm" variant={status.text === 'En Retard' ? 'secondary' : 'outline'} onClick={() => handleSetAttendance(student.id, 'late')}>Retard</Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : (
            <div className="text-center py-16 text-gray-500 border-2 border-dashed rounded-lg">
                <p className="font-medium">Veuillez sélectionner une classe pour commencer le pointage.</p>
            </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AttendancePage;