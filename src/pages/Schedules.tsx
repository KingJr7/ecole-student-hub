import { useState, useEffect } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import MainLayout from '@/components/Layout/MainLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const daysOfWeek = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const timeSlots = Array.from({ length: 10 }, (_, i) => `${8 + i}:00`); // 8:00 to 17:00

const SchedulesPage = () => {
  const { getAllClasses, getClassSubjects, createSchedule, getSchedulesForClass } = useDatabase();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState({});

  useEffect(() => {
    const fetchClasses = async () => {
      const allClasses = await getAllClasses();
      setClasses(allClasses);
    };
    fetchClasses();
  }, []);

  const fetchSchedules = async (classId) => {
    const classSchedules = await getSchedulesForClass(classId);
    const schedulesMap = {};
    classSchedules.forEach(schedule => {
      const key = `${schedule.day_of_week}-${schedule.start_time}`;
      if (!schedulesMap[key]) {
        schedulesMap[key] = [];
      }
      schedulesMap[key].push(schedule);
    });
    setSchedules(schedulesMap);
  };

  useEffect(() => {
    if (selectedClass) {
      const fetchInitialData = async () => {
        const classSubjects = await getClassSubjects(selectedClass.id);
        setSubjects(classSubjects);
        await fetchSchedules(selectedClass.id);
      };
      fetchInitialData();
    }
  }, [selectedClass]);

  const handleScheduleChange = async (lesson_id_str: string, day_of_week: string, start_time: string) => {
    if (!lesson_id_str) return;
    const lesson_id = parseInt(lesson_id_str, 10);
    if (isNaN(lesson_id)) return;

    const end_time = `${parseInt(start_time.split(':')[0]) + 1}:00`;
    await createSchedule({ lesson_id, day_of_week, start_time, end_time });
    await fetchSchedules(selectedClass.id);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Gestion de l'Emploi du Temps</h2>
        <Select onValueChange={value => setSelectedClass(classes.find(c => c.id.toString() === value))}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Sélectionnez une classe" />
          </SelectTrigger>
          <SelectContent>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedClass && (
          <Card>
            <CardHeader>
              <CardTitle>Emploi du temps pour {selectedClass.name}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-1 text-center font-bold min-w-[800px]">
                <div className="p-2">Heure</div>
                {daysOfWeek.map(day => <div key={day} className="p-2 border-b-2">{day}</div>)}
              </div>
              {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-7 gap-1 mt-1 items-start min-w-[800px]">
                  <div className="p-2 text-center font-semibold">{time}</div>
                  {daysOfWeek.map(day => {
                    const key = `${day}-${time}`;
                    const scheduledItems = schedules[key] || [];
                    return (
                      <div key={day} className="p-1 border rounded-md min-h-[100px] bg-gray-50 flex flex-col space-y-1">
                        {scheduledItems.map(schedule => (
                          <div key={schedule.id} className="bg-blue-100 p-2 rounded-md text-xs">
                            <p className="font-bold">{schedule.lesson.subject.name}</p>
                            <p className="text-gray-600">{schedule.lesson.teacher.first_name}</p>
                          </div>
                        ))}
                        <Select onValueChange={lesson_id => handleScheduleChange(lesson_id, day, time)}>
                          <SelectTrigger className="mt-auto w-full h-8 text-xs">
                            <SelectValue placeholder="+" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map(lesson => (
                              <SelectItem key={lesson.id} value={lesson.id.toString()}>
                                {lesson.subject.name} ({lesson.teacher.first_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default SchedulesPage;
