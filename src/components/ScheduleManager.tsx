import { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useDatabase } from '@/hooks/useDatabase';
import { PlusCircle, Trash2 } from 'lucide-react';

const scheduleSchema = z.object({
  schedules: z.array(z.object({
    id: z.number().optional(),
    day_of_week: z.string().min(1),
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }))
});

export const ScheduleManager = ({ lesson, onSuccess }) => {
  const { getSchedulesForLesson, createSchedule, updateSchedule, deleteSchedule } = useDatabase();
  const [schedules, setSchedules] = useState([]);

  const form = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { schedules: [] }
  });

  const { fields, append, remove, replace } = useFieldArray({ 
    control: form.control,
    name: "schedules"
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      if (lesson) {
        const fetchedSchedules = await getSchedulesForLesson(lesson.id);
        setSchedules(fetchedSchedules);
        replace(fetchedSchedules.map(s => ({ ...s, id: s.id })));
      }
    };
    fetchSchedules();
  }, [lesson, getSchedulesForLesson, replace]);

  const onSubmit = async (data) => {
    try {
      for (const scheduleData of data.schedules) {
        const payload = { ...scheduleData, lessonId: lesson.id };
        if (scheduleData.id) {
          await updateSchedule(scheduleData.id, payload);
        } else {
          await createSchedule(payload);
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save schedules', error);
    }
  };

  const handleRemoveSchedule = async (index, scheduleId) => {
    if (scheduleId) {
      await deleteSchedule(scheduleId);
    }
    remove(index);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
            <FormField
              control={form.control}
              name={`schedules.${index}.day_of_week`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jour</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="lundi">Lundi</SelectItem>
                      <SelectItem value="mardi">Mardi</SelectItem>
                      <SelectItem value="mercredi">Mercredi</SelectItem>
                      <SelectItem value="jeudi">Jeudi</SelectItem>
                      <SelectItem value="vendredi">Vendredi</SelectItem>
                      <SelectItem value="samedi">Samedi</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`schedules.${index}.start_time`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Début</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`schedules.${index}.end_time`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                </FormItem>
              )}
            />
            <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveSchedule(index, field.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => append({ day_of_week: 'lundi', start_time: '08:00', end_time: '10:00' })}>
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un horaire
        </Button>
        <Button type="submit">Enregistrer les horaires</Button>
      </form>
    </Form>
  );
};
