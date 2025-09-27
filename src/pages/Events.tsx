import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PlusCircle, Edit, Trash, Calendar as CalendarIcon, MapPin } from "lucide-react";

import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDatabase } from "@/hooks/useDatabase";
import { Event } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { getAccessLevel, PERMISSIONS } from "@/lib/permissions";

const eventFormSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  date: z.string().min(1, "La date est requise."),
  description: z.string().optional(),
  location: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const EventsPage = () => {
  const { user } = useAuth();
  const accessLevel = getAccessLevel(user?.role, user?.permissions, PERMISSIONS.CAN_MANAGE_EVENTS);
  const isReadOnly = accessLevel === 'read_only';

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAllEvents: fetchEvents, createEvent, updateEvent, deleteEvent } = useDatabase();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events = [], isLoading } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { title: "", date: "", description: "", location: "" },
  });

  useEffect(() => {
    if (selectedEvent) {
      form.reset({
        title: selectedEvent.title,
        date: format(new Date(selectedEvent.date), 'yyyy-MM-dd'),
        description: selectedEvent.description || "",
        location: selectedEvent.location || "",
      });
    } else {
      form.reset({ title: "", date: "", description: "", location: "" });
    }
  }, [selectedEvent, form]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setOpenDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  };

  const addMutation = useMutation({ ...mutationOptions, mutationFn: createEvent, onSuccess: (...args) => { mutationOptions.onSuccess(); toast({ title: "Événement créé" }); } });
  const updateMutation = useMutation({ ...mutationOptions, mutationFn: (data: { id: number, data: EventFormValues }) => updateEvent(data.id, data.data), onSuccess: (...args) => { mutationOptions.onSuccess(); toast({ title: "Événement mis à jour" }); } });
  const deleteMutation = useMutation({ ...mutationOptions, mutationFn: deleteEvent, onSuccess: (...args) => { mutationOptions.onSuccess(); toast({ title: "Événement supprimé" }); } });

  const onSubmit = (data: EventFormValues) => {
    if (isReadOnly) return;
    const eventData = { ...data, date: new Date(data.date).toISOString() };
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data: eventData });
    } else {
      addMutation.mutate(eventData);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-extrabold tracking-tight">Événements de l'école</h2>
          {!isReadOnly && <Button onClick={() => { setSelectedEvent(null); setOpenDialog(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Créer un événement</Button>}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse"><CardHeader><div className="h-6 bg-muted rounded w-3/4"></div><div className="h-4 bg-muted rounded w-1/2 mt-2"></div></CardHeader><CardContent><div className="h-4 bg-muted rounded w-full"></div></CardContent></Card>) 
           : events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 pt-2">
                  <span className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4" />{format(new Date(event.date), "PPP", { locale: fr })}</span>
                  {event.location && <span className="flex items-center"><MapPin className="mr-2 h-4 w-4" />{event.location}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                {!isReadOnly && 
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedEvent(event); setOpenDialog(true); }}><Edit className="mr-1 h-4 w-4" /> Modifier</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(event.id)}><Trash className="mr-1 h-4 w-4" /> Supprimer</Button>
                  </div>
                }
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent ? "Modifier l'événement" : "Créer un événement"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="date" render={({ field }) => <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="location" render={({ field }) => <FormItem><FormLabel>Lieu</FormLabel><FormControl><Input {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>} />
              {!isReadOnly && <DialogFooter><Button type="button" variant="secondary" onClick={() => setOpenDialog(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></DialogFooter>}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default EventsPage;
