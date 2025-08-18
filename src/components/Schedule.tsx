import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2 } from 'lucide-react';

const daysOfWeek = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const timeSlots = Array.from({ length: 10 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);

const colorPalette = [
  '#fecdd3', '#fed7aa', '#fde68a', '#d9f99d', '#a5f3fc', '#bae6fd', '#ddd6fe', '#f0abfc'
];
const textColorPalette = [
  '#9f1239', '#9a3412', '#92400e', '#3f6212', '#155e75', '#075985', '#5b21b6', '#86198f'
];

const getColorForSubject = (subjectName) => {
  if (!subjectName) return { bg: colorPalette[7], text: textColorPalette[7] };
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colorPalette.length);
  return { bg: colorPalette[index], text: textColorPalette[index] };
};

const ScheduleSkeleton = () => (
    <div className="animate-pulse">
      <div className="grid grid-cols-7 gap-2 text-center font-bold min-w-[800px]">
        <div className="p-2">Heure</div>
        {daysOfWeek.map(day => <div key={day} className="p-2 border-b-2">{day}</div>)}
      </div>
      {timeSlots.map(time => (
        <div key={time} className="grid grid-cols-7 gap-2 mt-1 items-start min-w-[800px]">
          <div className="p-2 text-center font-semibold text-sm text-muted-foreground">{time}</div>
          {daysOfWeek.map(day => <div key={day} className="p-1 border rounded-lg min-h-[80px] bg-gray-50"><Skeleton className="w-full h-full"/></div>)}
        </div>
      ))}
    </div>
);

export const Schedule = ({ isLoading, schedules, handleOpenAddDialog, handleDeleteSchedule }) => {
    if (isLoading) return <ScheduleSkeleton />;

    return (
        <div className="min-w-[900px]">
            <div className="grid grid-cols-7 gap-2 text-center font-bold border-b pb-2">
                <div className="p-2 text-sm">Heure</div>
                {daysOfWeek.map(day => <div key={day} className="p-2 text-sm">{day}</div>)}
            </div>
            {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-7 gap-2 mt-2 items-stretch">
                    <div className="p-2 text-center font-semibold text-xs text-muted-foreground">{time}</div>
                    {daysOfWeek.map(day => {
                        const key = `${day}-${time}`;
                        const scheduledItems = schedules[key] || [];
                        return (
                            <div key={day} className="p-1 border rounded-lg min-h-[80px] bg-gray-50/50 flex flex-col justify-center items-center text-center space-y-1">
                                {scheduledItems.length > 0 ? scheduledItems.map(schedule => {
                                    const colors = getColorForSubject(schedule.lesson.subject.name);
                                    return (
                                        <div key={schedule.id} style={{ backgroundColor: colors.bg, color: colors.text }} className="group relative w-full p-2 rounded-lg text-xs font-medium">
                                            <p className="font-bold">{schedule.lesson.subject.name}</p>
                                            <p className="text-xs opacity-80">{schedule.lesson.teacher.first_name}</p>
                                            <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteSchedule(schedule.id)}><Trash2 className="h-3 w-3"/></Button>
                                        </div>
                                    );
                                }) : (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOpenAddDialog(day, time)}><Plus className="h-4 w-4"/></Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};