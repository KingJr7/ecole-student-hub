import { useState, useEffect } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import MainLayout from '@/components/Layout/MainLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getAccessLevel, PERMISSIONS } from "@/lib/permissions";
import { Schedule } from '@/components/Schedule'; // Importer le composant réutilisable
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";

const SchedulesPage = () => {
  const { user } = useAuth();
  const accessLevel = getAccessLevel(user?.role, user?.permissions, PERMISSIONS.CAN_MANAGE_SCHEDULES);
  const isReadOnly = accessLevel === 'read_only';

  const { getAllClasses, getClassSubjects, createSchedule, getSchedulesForClass, deleteSchedule } = useDatabase();
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newScheduleSlot, setNewScheduleSlot] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [settings, setSettings] = useState(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const db = useDatabase();

  const downloadSchedulePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // --- Logique des horaires dynamiques ---
    const allScheduleItems = Object.values(schedules).flat();
    const uniqueTimes = [...new Set(allScheduleItems.map(item => item.start_time.substring(0, 5)))];
    uniqueTimes.sort();

    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const head = [['Heure', ...days]];
    const body = uniqueTimes.map(hour => {
      const row = [hour];
      days.forEach(day => {
        const key = `${day}-${hour}`;
        const scheduleItems = schedules[key];
        const cellText = scheduleItems
          ? scheduleItems.map(item => `${item.lesson.subject.name}\n(${item.lesson.teacher.first_name[0]}. ${item.lesson.teacher.name})`).join('\n---\n')
          : '';
        row.push(cellText);
      });
      return row;
    });

    // --- Génération du tableau (Ancien Design) ---
    autoTable(doc, {
      startY: 15,
      head: head,
      body: body,
      theme: 'grid',
      styles: { cellPadding: 2, fontSize: 8, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`emploi_du_temps_${selectedClass.name}.pdf`);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingClasses(true);
      try {
        const [allClasses, settingsData, logoData] = await Promise.all([
          getAllClasses(),
          db.getSettings(),
          db.getSchoolLogoBase64()
        ]);
        setClasses(allClasses);
        setSettings(settingsData);
        setSchoolLogo(logoData);
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de charger les données initiales.", variant: "destructive" });
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchInitialData();
  }, [db]);

  const fetchSchedules = async (classId) => {
    setIsLoadingSchedule(true);
    try {
      const classSubjects = await getClassSubjects(classId);
      setSubjects(classSubjects);
      const classSchedules = await getSchedulesForClass(classId);
      const schedulesMap = {};
      classSchedules.forEach(schedule => {
        const key = `${schedule.day_of_week}-${schedule.start_time.substring(0, 5)}`;
        if (!schedulesMap[key]) schedulesMap[key] = [];
        schedulesMap[key].push(schedule);
      });
      setSchedules(schedulesMap);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de charger l'emploi du temps.", variant: "destructive" });
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchSchedules(selectedClass.id);
    }
  }, [selectedClass]);

  const handleOpenAddDialog = (day, time) => {
    if (isReadOnly) return;
    setNewScheduleSlot({ day, time });
    setSelectedLessonId('');
    setIsAddDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (isReadOnly || !selectedLessonId || !newScheduleSlot) return;
    const lesson_id = parseInt(selectedLessonId, 10);
    const { day, time } = newScheduleSlot;
    const end_time = `${parseInt(time.split(':')[0]) + 1}:00`;

    try {
      await createSchedule({ lesson_id, day_of_week: day, start_time: time, end_time });
      toast({ description: "Cours ajouté à l'emploi du temps.", variant: "success" });
      fetchSchedules(selectedClass.id);
      setIsAddDialogOpen(false);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible d'ajouter le cours.", variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (isReadOnly) return;
    try {
      await deleteSchedule(scheduleId);
      toast({ description: "Cours supprimé.", variant: "success" });
      fetchSchedules(selectedClass.id);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de supprimer le cours.", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="flex flex-wrap gap-4 justify-between items-center">
            <h2 className="text-4xl font-extrabold tracking-tight">Gestion de l'Emploi du Temps</h2>
            <div className="flex items-center gap-4">
              <Select onValueChange={value => setSelectedClass(classes.find(c => c.id.toString() === value))}>
                  <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder={isLoadingClasses ? "Chargement..." : "Sélectionnez une classe"} />
                  </SelectTrigger>
                  <SelectContent>
                      {classes.map(cls => <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              {selectedClass && <Button onClick={downloadSchedulePDF} variant="outline"><Download className="mr-2 h-4 w-4" />Imprimer l'emploi du temps</Button>}
            </div>
        </div>

        {selectedClass ? (
          <Card>
            <CardHeader><CardTitle>Emploi du temps pour {selectedClass.name}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
                <Schedule 
                    isLoading={isLoadingSchedule}
                    schedules={schedules}
                    isReadOnly={isReadOnly}
                    handleOpenAddDialog={handleOpenAddDialog}
                    handleDeleteSchedule={handleDeleteSchedule}
                />
            </CardContent>
          </Card>
        ) : (
            <div className="text-center py-16 text-gray-500 border-2 border-dashed rounded-lg">
                <p className="font-medium">Veuillez sélectionner une classe pour afficher son emploi du temps.</p>
            </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un cours</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p>Créneau : <span className="font-semibold">{newScheduleSlot?.day} à {newScheduleSlot?.time}</span></p>
            <Select onValueChange={setSelectedLessonId} value={selectedLessonId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(lesson => (
                  <SelectItem key={lesson.id} value={lesson.id.toString()}>
                    {lesson.subject.name} (Prof: {lesson.teacher.first_name} {lesson.teacher.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isReadOnly && <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveSchedule}>Ajouter</Button>
          </DialogFooter>}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default SchedulesPage;
