import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { PlusCircle, Edit, Trash, Save, Users, Book, Clock, DollarSign, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

import { getTeachers, addTeacher, updateTeacher, deleteTeacher, getTeacherStats, getTeacherWorkHours, addTeacherWorkHours, getSubjects, getTeacherWorkHoursToday } from "@/lib/api";
import { Teacher, Subject, TeacherWorkHours } from "@/types";

const teacherFormSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  password: z.string().optional(),
  address: z.string().optional(),
  speciality: z.string().optional(),
  hourlyRate: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, "Le taux horaire doit être positif")
  ),
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

const workHoursFormSchema = z.object({
  date: z.string().min(1, "La date est requise."),
  start_time: z.string().min(1, "L'heure de début est requise."),
  end_time: z.string().min(1, "L'heure de fin est requise."),
  subjectId: z.string().optional(),
  notes: z.string().optional(),
});

type WorkHoursFormValues = z.infer<typeof workHoursFormSchema>;

const Teachers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [openTeacherDialog, setOpenTeacherDialog] = useState(false);
  const [openWorkHoursDialog, setOpenWorkHoursDialog] = useState(false);

  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery({ queryKey: ["teachers"], queryFn: getTeachers });
  const { data: teacherSubjects = [], isLoading: isLoadingSubjects } = useQuery({ queryKey: ["teacherSubjects", selectedTeacher?.id], queryFn: () => selectedTeacher ? getSubjects(selectedTeacher.id) : Promise.resolve([]), enabled: !!selectedTeacher });
  const { data: workHours = [], isLoading: isLoadingWorkHours } = useQuery({ queryKey: ["teacherWorkHours", selectedTeacher?.id], queryFn: () => selectedTeacher ? getTeacherWorkHours(selectedTeacher.id) : Promise.resolve([]), enabled: !!selectedTeacher });
  const { data: teacherStats, isLoading: isLoadingStats } = useQuery({ queryKey: ["teacherStats", selectedTeacher?.id], queryFn: () => selectedTeacher ? getTeacherStats(selectedTeacher.id) : Promise.Sresolve({ totalHoursThisMonth: 0, totalEarningsThisMonth: 0, subjectHours: [] }), enabled: !!selectedTeacher });
  const { data: todayWorkStats, isLoading: isLoadingTodayWorkStats } = useQuery({
    queryKey: ["todayWorkStats", selectedTeacher?.id],
    queryFn: () => selectedTeacher ? getTeacherWorkHoursToday(selectedTeacher.id) : Promise.resolve({ totalHoursToday: 0, amountOwedToday: 0 }),
    enabled: !!selectedTeacher,
  });

  const addTeacherMutation = useMutation({ mutationFn: addTeacher, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast({ title: "Professeur ajouté" }); setOpenTeacherDialog(false); }, onError: (error) => { toast({ title: "Erreur", description: error.message, variant: "destructive" }); } });
  const updateTeacherMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Teacher> }) => updateTeacher(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast({ title: "Professeur mis à jour" }); setOpenTeacherDialog(false); }, onError: (error) => { toast({ title: "Erreur", description: `Erreur: ${error.message}`, variant: "destructive" }); } });
  const deleteTeacherMutation = useMutation({ mutationFn: deleteTeacher, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast({ title: "Professeur supprimé" }); setSelectedTeacher(null); }, onError: (error) => { toast({ title: "Erreur", description: `Erreur: ${error.message}`, variant: "destructive" }); } });
  const addWorkHoursMutation = useMutation({ mutationFn: addTeacherWorkHours, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teacherWorkHours", selectedTeacher?.id] }); queryClient.invalidateQueries({ queryKey: ["teacherStats", selectedTeacher?.id] }); toast({ title: "Heures enregistrées" }); setOpenWorkHoursDialog(false); }, onError: (error) => { toast({ title: "Erreur", description: `Erreur: ${error.message}`, variant: "destructive" }); } });

  const teacherForm = useForm<TeacherFormValues>({ resolver: zodResolver(teacherFormSchema), defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "", address: "", speciality: "", hourlyRate: 0 } });
  const workHoursForm = useForm<WorkHoursFormValues>({ resolver: zodResolver(workHoursFormSchema), defaultValues: { date: "", start_time: "", end_time: "", notes: "" } });

  const onTeacherFormSubmit: SubmitHandler<TeacherFormValues> = (data) => {
    if (!selectedTeacher && !data.password) {
        toast({ title: "Erreur", description: "Le mot de passe est obligatoire pour un nouveau professeur.", variant: "destructive" });
        return;
    }

    const teacherData: Partial<TeacherFormValues> = {
      name: data.lastName,
      first_name: data.firstName,
      email: data.email,
      phone: data.phone,
      adress: data.address,
      speciality: data.speciality,
      hourlyRate: data.hourlyRate,
    };

    if (data.password) {
        teacherData.password = data.password;
    }

    if (selectedTeacher) {
      updateTeacherMutation.mutate({ id: selectedTeacher.id, data: teacherData });
    } else {
      addTeacherMutation.mutate(teacherData as Teacher);
    }
  };

  const onWorkHoursFormSubmit: SubmitHandler<WorkHoursFormValues> = (data) => { if (selectedTeacher) { addWorkHoursMutation.mutate({ teacher_id: selectedTeacher.id, subject_id: data.subjectId ? parseInt(data.subjectId, 10) : undefined, date: data.date, start_time: data.start_time, end_time: data.end_time, notes: data.notes }); } };
  const handleTeacherSelect = (teacher: Teacher) => { setSelectedTeacher(teacher); };
  const handleEditTeacher = (teacher: Teacher) => { setSelectedTeacher(teacher); teacherForm.reset({ firstName: teacher.first_name, lastName: teacher.name, email: teacher.email, phone: teacher.phone, address: teacher.adress || "", speciality: teacher.speciality || "", hourlyRate: teacher.hourlyRate || 0, password: "" }); setOpenTeacherDialog(true); };
  const handleDeleteTeacher = (id: string) => { if (confirm("Êtes-vous sûr de vouloir supprimer ce professeur ?")) { deleteTeacherMutation.mutate(id); } };
  const handleNewTeacher = () => { setSelectedTeacher(null); teacherForm.reset({ firstName: "", lastName: "", email: "", phone: "", password: "", address: "", speciality: "", hourlyRate: 0 }); setOpenTeacherDialog(true); };
  const handleAddWorkHours = () => { if (selectedTeacher) { workHoursForm.reset({ date: "", start_time: "", end_time: "", notes: "" }); setOpenWorkHoursDialog(true); } };
  const getSubjectName = (subjectId?: string) => { if (!subjectId) return "N/A"; const subject = teacherSubjects.find(s => s.id === subjectId); return subject ? subject.name : "Inconnu"; };
  const getTeacherSubjects = () => { return teacherSubjects || []; };
  const getTeacherClasses = () => { const subjects = getTeacherSubjects(); const uniqueClasses = new Map(); subjects.forEach(subject => { if (subject.class && !uniqueClasses.has(subject.class.id)) { uniqueClasses.set(subject.class.id, subject.class); } }); return Array.from(uniqueClasses.values()); };

  return (
    <MainLayout title="Gestion des Professeurs">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="flex items-center justify-between"><span>Professeurs</span><Button onClick={handleNewTeacher} size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" />Nouveau</Button></CardTitle><CardDescription>Liste des professeurs de l'établissement</CardDescription></CardHeader>
          <CardContent>
            {isLoadingTeachers ? (
              <div className="space-y-2 animate-pulse">{[...Array(5)].map((_, i) => (<div key={i} className="flex items-center justify-between p-3 border rounded-md"><div><Skeleton className="h-5 w-32 rounded-md" /><Skeleton className="h-4 w-40 mt-2 rounded-md" /></div><div className="flex space-x-1"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></div>))}
              </div>
            ) : teachers.length === 0 ? (
              <p className="text-center py-4">Aucun professeur trouvé</p>
            ) : (
              <div className="space-y-2">{teachers.map((teacher) => (<div key={teacher.id} className={`flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${selectedTeacher?.id === teacher.id ? "bg-muted" : ""}`} onClick={() => handleTeacherSelect(teacher)}><div><h3 className="font-medium">{teacher.first_name} {teacher.name}</h3><p className="text-sm text-muted-foreground">{teacher.speciality || teacher.email}</p></div><div className="flex space-x-1"><Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditTeacher(teacher); }}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteTeacher(teacher.id); }}><Trash className="h-4 w-4" /></Button></div></div>))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>{selectedTeacher ? `${selectedTeacher.first_name} ${selectedTeacher.name}` : "Sélectionnez un professeur"}</CardTitle><div className="text-sm text-muted-foreground mt-1">{selectedTeacher && (<div className="space-y-1"><p>{selectedTeacher.email} | {selectedTeacher.phone}</p>{selectedTeacher.adress && <p>Adresse: {selectedTeacher.adress}</p>}{selectedTeacher.speciality && <p>Spécialité: {selectedTeacher.speciality}</p>}</div>)}{!selectedTeacher && "Cliquez sur un professeur pour voir ses détails"}</div></CardHeader>
          {selectedTeacher ? (
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList className="mb-4"><TabsTrigger value="overview">Vue d'ensemble</TabsTrigger><TabsTrigger value="subjects">Matières</TabsTrigger><TabsTrigger value="workhours">Pointage</TabsTrigger></TabsList>
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6"><Card><CardHeader className="p-4"><CardTitle className="text-base flex items-center"><Clock className="mr-2 h-4 w-4" />Heures ce mois</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{isLoadingStats ? "..." : (teacherStats?.totalHoursThisMonth || 0).toFixed(1)}h</p></CardContent></Card><Card><CardHeader className="p-4"><CardTitle className="text-base flex items-center"><DollarSign className="mr-2 h-4 w-4" />Rémunération ce mois</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{isLoadingStats ? "..." : `${Math.round(teacherStats?.totalEarningsThisMonth || 0).toLocaleString()} FCFA`}</p></CardContent></Card><Card><CardHeader className="p-4"><CardTitle className="text-base flex items-center"><Book className="mr-2 h-4 w-4" />Matières enseignées</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{isLoadingSubjects ? "..." : getTeacherSubjects().length}</p></CardContent></Card><Card><CardHeader className="p-4"><CardTitle className="text-base flex items-center"><DollarSign className="mr-2 h-4 w-4" />Rémunération aujourd'hui</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{isLoadingTodayWorkStats ? "..." : `${Math.round(todayWorkStats?.amountOwedToday || 0).toLocaleString()} FCFA`}</p></CardContent></Card></div>
                  <div className="mb-6"><h3 className="text-lg font-medium mb-2">Taux horaire</h3><div className="flex items-center"><p className="text-xl font-semibold">{selectedTeacher.hourlyRate?.toLocaleString() || "0"} FCFA / heure</p><Button variant="outline" size="sm" className="ml-2" onClick={() => handleEditTeacher(selectedTeacher)}><Edit className="h-4 w-4 mr-1" /> Modifier</Button></div></div>
                  <div className="mb-6"><h3 className="text-lg font-medium mb-2">Classes</h3>{isLoadingSubjects ? <p className="text-center py-4">Chargement...</p> : getTeacherClasses().length === 0 ? <p className="text-muted-foreground">Aucune classe assignée</p> : <div className="flex flex-wrap gap-2">{getTeacherClasses().map(classItem => (<div key={classItem.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">{classItem.name}</div>))}</div>}
                  </div>
                  <div><div className="flex justify-between items-center mb-2"><h3 className="text-lg font-medium">Répartition des heures ce mois</h3><Button variant="outline" size="sm" onClick={handleAddWorkHours}><PlusCircle className="h-4 w-4 mr-1" /> Ajouter des heures</Button></div>{isLoadingStats ? <p className="text-center py-4">Chargement...</p> : teacherStats?.subjectHours.length === 0 ? <p className="text-muted-foreground">Aucune heure enregistrée ce mois-ci</p> : <Table><TableHeader><TableRow><TableHead>Matière</TableHead><TableHead className="text-right">Heures</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader><TableBody>{teacherStats?.subjectHours.map((item, index) => (<TableRow key={index}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.hours.toFixed(1)}h</TableCell><TableCell className="text-right">{Math.round((selectedTeacher.hourlyRate || 0) * item.hours).toLocaleString()} FCFA</TableCell></TableRow>))}</TableBody></Table>}</div>
                </TabsContent>
                <TabsContent value="subjects">{isLoadingSubjects ? <p className="text-center py-4">Chargement...</p> : getTeacherSubjects().length === 0 ? <p className="text-center py-4">Ce professeur n'enseigne aucune matière actuellement.</p> : <Table><TableHeader><TableRow><TableHead>Matière</TableHead><TableHead>Classe</TableHead><TableHead>Coefficient</TableHead></TableRow></TableHeader><TableBody>{getTeacherSubjects().map((subject) => (<TableRow key={subject.id}><TableCell>{subject.name}</TableCell><TableCell>{subject.class?.name || 'Non spécifiée'}</TableCell><TableCell>{subject.coefficient}</TableCell></TableRow>))}</TableBody></Table>}</TabsContent>
                <TabsContent value="workhours"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-medium">Historique des pointages</h3><Button onClick={handleAddWorkHours}><PlusCircle className="h-4 w-4 mr-2" /> Pointer des heures</Button></div>{isLoadingWorkHours ? <p className="text-center py-4">Chargement...</p> : workHours.length === 0 ? <p className="text-center py-4">Aucun pointage enregistré pour ce professeur.</p> : <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Matière</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Heures</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader><TableBody>{workHours.map((record) => {
                  const amount = record.hours * (selectedTeacher.hourlyRate || 0);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{getSubjectName(record.subject_id)}</TableCell>
                      <TableCell>{record.notes || "-"}</TableCell>
                      <TableCell className="text-right">{record.hours.toFixed(2)}h</TableCell>
                      <TableCell className="text-right font-semibold">{Math.round(amount).toLocaleString()} FCFA</TableCell>
                    </TableRow>
                  );
                })}</TableBody></Table>}</TabsContent>
              </Tabs>
            </CardContent>
          ) : (<CardContent><div className="flex flex-col items-center justify-center py-8"><Users className="h-12 w-12 text-muted-foreground mb-4" /><div className="text-muted-foreground text-center">Sélectionnez un professeur dans la liste pour voir ses détails</div></div></CardContent>)}
        </Card>
      </div>

      <Dialog open={openTeacherDialog} onOpenChange={setOpenTeacherDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{selectedTeacher ? "Modifier le professeur" : "Ajouter un professeur"}</DialogTitle><DialogDescription>{selectedTeacher ? "Modifiez les informations du professeur ci-dessous." : "Entrez les informations du nouveau professeur."}</DialogDescription></DialogHeader>
          <Form {...teacherForm}>
            <form onSubmit={teacherForm.handleSubmit(onTeacherFormSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4"><FormField control={teacherForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Prénom" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={teacherForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Nom" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
              <FormField control={teacherForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teacherForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input placeholder="Numéro de téléphone" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teacherForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Mot de passe</FormLabel><FormControl><Input type="password" placeholder={selectedTeacher ? "Laisser vide pour ne pas changer" : "Mot de passe obligatoire"} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teacherForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input placeholder="Adresse du professeur" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teacherForm.control} name="speciality" render={({ field }) => (<FormItem><FormLabel>Spécialité</FormLabel><FormControl><Input placeholder="Spécialité ou domaine d'expertise" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teacherForm.control} name="hourlyRate" render={({ field }) => (<FormItem><FormLabel>Taux horaire (FCFA)</FormLabel><FormControl><Input type="number" placeholder="Taux horaire" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenTeacherDialog(false)}>Annuler</Button><Button type="submit"><Save className="h-4 w-4 mr-2" />Enregistrer</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={openWorkHoursDialog} onOpenChange={setOpenWorkHoursDialog}><DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Pointer des heures de travail</DialogTitle><DialogDescription>Enregistrez les heures travaillées par {selectedTeacher?.firstName} {selectedTeacher?.lastName}</DialogDescription></DialogHeader><Form {...workHoursForm}><form onSubmit={workHoursForm.handleSubmit(onWorkHoursFormSubmit)} className="space-y-4"><FormField control={workHoursForm.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={workHoursForm.control} name="start_time" render={({ field }) => (<FormItem><FormLabel>Heure de début</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={workHoursForm.control} name="end_time" render={({ field }) => (<FormItem><FormLabel>Heure de fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} /></div><FormField control={workHoursForm.control} name="subjectId" render={({ field }) => (<FormItem><FormLabel>Matière (Optionnel)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une matière" /></SelectTrigger></FormControl><SelectContent>{getTeacherSubjects().map((subject) => (<SelectItem key={subject.id} value={subject.id.toString()}>{subject.name} {subject.class && `- ${subject.class.name}`}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={workHoursForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Notes additionnelles" {...field} /></FormControl><FormMessage /></FormItem>)} /><DialogFooter><Button type="button" variant="outline" onClick={() => setOpenWorkHoursDialog(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></DialogFooter></form></Form></DialogContent></Dialog>
    </MainLayout>
  );
};

export default Teachers;