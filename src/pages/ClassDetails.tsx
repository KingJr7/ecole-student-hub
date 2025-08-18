import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDatabase } from '@/hooks/useDatabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { User, BookOpen } from 'lucide-react';
import { Schedule } from '@/components/Schedule';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";

const ClassDetailsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <Skeleton className="h-9 w-1/2 rounded-md" />
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader><Skeleton className="h-7 w-40 rounded-md" /></CardHeader>
                <CardContent className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-7 w-48 rounded-md" /></CardHeader>
                <CardContent><Skeleton className="h-64 w-full rounded-md" /></CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-7 w-48 rounded-md" /></CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                </CardContent>
            </Card>
        </div>
    </div>
);

const ClassDetails = () => {
  const { classId } = useParams<{ classId: string }>();
  const [cls, setClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [subjects, setSubjects] = useState([]); // lessons for the class
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const db = useDatabase();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newScheduleSlot, setNewScheduleSlot] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState('');

  const fetchSchedules = async () => {
    if (!classId) return;
    const classSchedules = await db.getSchedulesForClass(parseInt(classId, 10));
    const schedulesMap = {};
    classSchedules.forEach(schedule => {
      const key = `${schedule.day_of_week}-${schedule.start_time.substring(0, 5)}`;
      if (!schedulesMap[key]) schedulesMap[key] = [];
      schedulesMap[key].push(schedule);
    });
    setSchedules(schedulesMap);
  };

  useEffect(() => {
    const loadClassData = async () => {
      if (!classId) return;
      setLoading(true);
      try {
        const allClasses = await db.getAllClasses();
        const currentClass = allClasses.find(c => c.id.toString() === classId);
        setClass(currentClass);

        if (currentClass) {
            const allStudents = await db.getAllStudents();
            const classStudents = allStudents.filter(s => s.registrations[0]?.class_id.toString() === classId);
            setStudents(classStudents);
    
            const classSubjects = await db.getClassSubjects(parseInt(classId, 10));
            setSubjects(classSubjects);

            await fetchSchedules();
        }
      } catch (error) {
        console.error("Failed to load class details:", error);
      } finally {
        setLoading(false);
      }
    };
    loadClassData();
  }, [classId, db]);

  const handleOpenAddDialog = (day, time) => {
    setNewScheduleSlot({ day, time });
    setSelectedLessonId('');
    setIsAddDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!selectedLessonId || !newScheduleSlot) return;
    const lesson_id = parseInt(selectedLessonId, 10);
    const { day, time } = newScheduleSlot;
    const end_time = `${parseInt(time.split(':')[0]) + 1}:00`;

    try {
      await db.createSchedule({ lesson_id, day_of_week: day, start_time: time, end_time });
      toast({ description: "Cours ajouté.", variant: "success" });
      fetchSchedules();
      setIsAddDialogOpen(false);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible d'ajouter le cours.", variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await db.deleteSchedule(scheduleId);
      toast({ description: "Cours supprimé.", variant: "success" });
      fetchSchedules();
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de supprimer le cours.", variant: "destructive" });
    }
  };

  if (loading) {
    return <MainLayout><ClassDetailsSkeleton /></MainLayout>;
  }

  if (!cls) {
    return <MainLayout><div>Classe non trouvée.</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <h1 className="text-4xl font-extrabold tracking-tight">{cls.name}</h1>
        
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Élèves Inscrits ({students.length})</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {students.map(student => (
                  <li key={student.id}>
                    <Link to={`/students/${student.id}`} className="flex items-center justify-between p-3 bg-secondary rounded-lg border hover:bg-muted transition-colors">
                        <span className="font-medium text-sm flex items-center"><User className="w-4 h-4 mr-2" />{student.first_name} {student.name}</span>
                        <Button size="sm" variant="ghost">Détails</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Emploi du Temps</CardTitle></CardHeader>
            <CardContent>
              <Schedule 
                  isLoading={loading} 
                  schedules={schedules} 
                  handleOpenAddDialog={handleOpenAddDialog} 
                  handleDeleteSchedule={handleDeleteSchedule} 
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Matières Enseignées</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subjects.map(lesson => (
                  <div key={lesson.id} className="flex items-center justify-between p-3 bg-secondary rounded-md border">
                      <div>
                          <p className="font-semibold flex items-center"><BookOpen className="w-4 h-4 mr-2"/>{lesson.subject.name}</p>
                          <p className="text-sm text-muted-foreground ml-6">Prof: {lesson.teacher.first_name} {lesson.teacher.name}</p>
                      </div>
                      <span className="text-sm font-mono bg-muted text-muted-foreground px-2 py-1 rounded">
                          Coef: {lesson.subject.coefficient}
                      </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un cours</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p>Créneau : <span className="font-semibold">{newScheduleSlot?.day} à {newScheduleSlot?.time}</span></p>
            <Select onValueChange={setSelectedLessonId} value={selectedLessonId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une matière" /></SelectTrigger>
              <SelectContent>
                {subjects.map(lesson => (
                  <SelectItem key={lesson.id} value={lesson.id.toString()}>
                    {lesson.subject.name} (Prof: {lesson.teacher.first_name} {lesson.teacher.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveSchedule}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ClassDetails;