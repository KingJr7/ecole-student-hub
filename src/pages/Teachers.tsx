
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PlusCircle, Edit, Trash, Save, Users, Book, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { 
  getTeachers, 
  addTeacher, 
  updateTeacher, 
  deleteTeacher,
  getTeacherStats,
  getTeacherWorkHours,
  addTeacherWorkHours,
  getSubjects
} from "@/lib/api";
import { Teacher, Subject, TeacherWorkHours } from "@/types";

// Schéma du formulaire d'ajout/édition de professeur
const teacherFormSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  address: z.string().optional(),
  speciality: z.string().optional(),
  hourlyRate: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, "Le taux horaire doit être positif")
  ),
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

// Schéma du formulaire d'ajout d'heures travaillées
const workHoursFormSchema = z.object({
  teacherId: z.number(),
  hours: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0.5, "Le nombre d'heures doit être d'au moins 0.5")
  ),
  // La date et l'heure sont automatiquement celles du moment de l'enregistrement
  subjectId: z.number().optional(),
  notes: z.string().optional(),
});

type WorkHoursFormValues = z.infer<typeof workHoursFormSchema>;

const Teachers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [openTeacherDialog, setOpenTeacherDialog] = useState(false);
  const [openWorkHoursDialog, setOpenWorkHoursDialog] = useState(false);

  // Récupération des données
  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: getTeachers,
  });

  // Récupérer les matières pour le professeur sélectionné
  const { data: teacherSubjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["teacherSubjects", selectedTeacher?.id],
    queryFn: () => selectedTeacher ? getSubjects(selectedTeacher.id) : Promise.resolve([]),
    enabled: !!selectedTeacher,
  });

  const { data: workHours = [], isLoading: isLoadingWorkHours } = useQuery({
    queryKey: ["teacherWorkHours", selectedTeacher?.id],
    queryFn: () => selectedTeacher ? getTeacherWorkHours(selectedTeacher.id) : Promise.resolve([]),
    enabled: !!selectedTeacher,
  });

  const { data: teacherStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["teacherStats", selectedTeacher?.id],
    queryFn: () => selectedTeacher ? getTeacherStats(selectedTeacher.id) : Promise.resolve({
      totalHoursThisMonth: 0,
      totalEarningsThisMonth: 0,
      subjectHours: []
    }),
    enabled: !!selectedTeacher,
  });

  // Mutations
  const addTeacherMutation = useMutation({
    mutationFn: addTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "Professeur ajouté",
        description: "Le professeur a été ajouté avec succès",
        variant: "default",
      });
      setOpenTeacherDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'ajout du professeur: ${error}`,
        variant: "destructive",
      });
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Teacher> }) => 
      updateTeacher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "Professeur mis à jour",
        description: "Le professeur a été mis à jour avec succès",
        variant: "default",
      });
      setOpenTeacherDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour du professeur: ${error}`,
        variant: "destructive",
      });
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "Professeur supprimé",
        description: "Le professeur a été supprimé avec succès",
        variant: "default",
      });
      setSelectedTeacher(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression du professeur: ${error}`,
        variant: "destructive",
      });
    },
  });

  const addWorkHoursMutation = useMutation({
    mutationFn: addTeacherWorkHours,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherWorkHours", selectedTeacher?.id] });
      queryClient.invalidateQueries({ queryKey: ["teacherStats", selectedTeacher?.id] });
      toast({
        title: "Heures enregistrées",
        description: "Les heures de travail ont été enregistrées avec succès",
        variant: "default",
      });
      setOpenWorkHoursDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'enregistrement des heures: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Formulaires
  const teacherForm = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      speciality: "",
      hourlyRate: 0,
    },
  });

  const workHoursForm = useForm<WorkHoursFormValues>({
    resolver: zodResolver(workHoursFormSchema),
    defaultValues: {
      teacherId: 0,
      hours: 0,
      notes: "",
    },
  });

  // Gestionnaires d'événements
  const onTeacherFormSubmit: SubmitHandler<TeacherFormValues> = (data) => {
    if (selectedTeacher) {
      updateTeacherMutation.mutate({ id: selectedTeacher.id, data });
    } else {
      addTeacherMutation.mutate(data);
    }
  };

  const onWorkHoursFormSubmit: SubmitHandler<WorkHoursFormValues> = (data) => {
    if (selectedTeacher) {
      // Utiliser la date et l'heure actuelles au moment de l'enregistrement
      const now = new Date();
      const isoDateTime = now.toISOString();
      const formattedDate = format(now, "yyyy-MM-dd");
      const formattedTime = format(now, "HH:mm:ss");
      
      addWorkHoursMutation.mutate({
        ...data,
        teacherId: selectedTeacher.id,
        date: isoDateTime, // Utiliser la date et l'heure exactes au moment de l'enregistrement
      });
      
      console.log(`Pointage enregistré pour ${selectedTeacher.firstName} ${selectedTeacher.lastName}: ${data.hours}h le ${formattedDate} à ${formattedTime}`);
    }
  };

  const handleTeacherSelect = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    teacherForm.reset({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      address: teacher.address || "",
      speciality: teacher.speciality || "",
      hourlyRate: teacher.hourlyRate || 0,
    });
    setOpenTeacherDialog(true);
  };

  const handleDeleteTeacher = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce professeur ?")) {
      deleteTeacherMutation.mutate(id);
    }
  };

  const handleNewTeacher = () => {
    setSelectedTeacher(null);
    teacherForm.reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      speciality: "",
      hourlyRate: 0,
    });
    setOpenTeacherDialog(true);
  };

  const handleAddWorkHours = () => {
    if (selectedTeacher) {
      workHoursForm.reset({
        teacherId: selectedTeacher.id,
        hours: 0,
        notes: "",
      });
      setOpenWorkHoursDialog(true);
    }
  };

  // Fonctions utilitaires
  const getSubjectName = (subjectId?: number) => {
    if (!subjectId) return "N/A";
    // Utiliser teacherSubjects au lieu de subjects
    const subject = teacherSubjects.find(s => s.id === subjectId);
    return subject ? subject.name : "Inconnu";
  };

  // Cette fonction n'est plus nécessaire car nous récupérons directement les matières du professeur
  // via l'API, mais nous la gardons pour la compatibilité avec le reste du code
  const getTeacherSubjects = () => {
    return teacherSubjects || [];
  };

  // Obtenir les classes uniques où le professeur enseigne
  const getTeacherClasses = () => {
    const subjects = getTeacherSubjects();
    // Créer un ensemble pour éviter les doublons
    const uniqueClasses = new Set();
    
    // Stocker chaque classe unique avec son ID et son nom
    const classes = [];
    
    subjects.forEach(subject => {
      if (subject.className && !uniqueClasses.has(subject.className)) {
        uniqueClasses.add(subject.className);
        classes.push({
          id: subject.classId,
          name: subject.className
        });
      }
    });
    
    return classes;
  };

  return (
    <MainLayout title="Gestion des Professeurs">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Liste des professeurs */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Professeurs</span>
              <Button onClick={handleNewTeacher} size="sm" variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau
              </Button>
            </CardTitle>
            <CardDescription>Liste des professeurs de l'établissement</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTeachers ? (
              <p className="text-center py-4">Chargement...</p>
            ) : teachers.length === 0 ? (
              <p className="text-center py-4">Aucun professeur trouvé</p>
            ) : (
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <div 
                    key={teacher.id} 
                    className={`flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedTeacher?.id === teacher.id ? "bg-muted" : ""
                    }`}
                    onClick={() => handleTeacherSelect(teacher)}
                  >
                    <div>
                      <h3 className="font-medium">{teacher.firstName} {teacher.lastName}</h3>
                      <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTeacher(teacher);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTeacher(teacher.id);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Détails du professeur sélectionné */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedTeacher 
                ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` 
                : "Sélectionnez un professeur"}
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              {selectedTeacher && (
                <div className="space-y-1">
                  <p>{selectedTeacher.email} | {selectedTeacher.phone}</p>
                  {selectedTeacher.address && <p>Adresse: {selectedTeacher.address}</p>}
                  {selectedTeacher.speciality && <p>Spécialité: {selectedTeacher.speciality}</p>}
                </div>
              )}
              {!selectedTeacher && "Cliquez sur un professeur pour voir ses détails"}
            </div>
          </CardHeader>
          {selectedTeacher ? (
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                  <TabsTrigger value="subjects">Matières</TabsTrigger>
                  <TabsTrigger value="workhours">Pointage</TabsTrigger>
                </TabsList>

                {/* Vue d'ensemble */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          Heures ce mois
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">
                          {isLoadingStats ? "..." : teacherStats?.totalHoursThisMonth || 0}h
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center">
                          <DollarSign className="mr-2 h-4 w-4" />
                          Rémunération ce mois
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">
                          {isLoadingStats 
                            ? "..." 
                            : `${(teacherStats?.totalEarningsThisMonth || 0).toLocaleString()} FCFA`}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center">
                          <Book className="mr-2 h-4 w-4" />
                          Matières enseignées
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">
                          {isLoadingSubjects ? "..." : getTeacherSubjects().length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Taux horaire */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Taux horaire</h3>
                    <div className="flex items-center">
                      <p className="text-xl font-semibold">
                        {selectedTeacher.hourlyRate?.toLocaleString() || "0"} FCFA / heure
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-2"
                        onClick={() => handleEditTeacher(selectedTeacher)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Modifier
                      </Button>
                    </div>
                  </div>

                  {/* Classes où le professeur enseigne */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Classes</h3>
                    {isLoadingSubjects ? (
                      <p className="text-center py-4">Chargement...</p>
                    ) : getTeacherClasses().length === 0 ? (
                      <p className="text-muted-foreground">Aucune classe assignée</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {getTeacherClasses().map(classItem => (
                          <div 
                            key={classItem.id} 
                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                          >
                            {classItem.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Répartition des heures par matière */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">Répartition des heures ce mois</h3>
                      <Button variant="outline" size="sm" onClick={handleAddWorkHours}>
                        <PlusCircle className="h-4 w-4 mr-1" /> Ajouter des heures
                      </Button>
                    </div>
                    
                    {isLoadingStats ? (
                      <p className="text-center py-4">Chargement...</p>
                    ) : teacherStats?.subjectHours.length === 0 ? (
                      <p className="text-muted-foreground">Aucune heure enregistrée ce mois-ci</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Matière</TableHead>
                            <TableHead className="text-right">Heures</TableHead>
                            <TableHead className="text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teacherStats?.subjectHours.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">{item.hours}h</TableCell>
                              <TableCell className="text-right">
                                {((selectedTeacher.hourlyRate || 0) * item.hours).toLocaleString()} FCFA
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </TabsContent>

                {/* Matières enseignées */}
                <TabsContent value="subjects">
                  {isLoadingSubjects ? (
                    <p className="text-center py-4">Chargement...</p>
                  ) : getTeacherSubjects().length === 0 ? (
                    <p className="text-center py-4">Ce professeur n'enseigne aucune matière actuellement.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Matière</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead>Coefficient</TableHead>
                          <TableHead>Heures/semaine</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getTeacherSubjects().map((subject) => (
                          <TableRow key={subject.id}>
                            <TableCell>{subject.name}</TableCell>
                            <TableCell>{subject.className || 'Non spécifiée'}</TableCell>
                            <TableCell>{subject.coefficient}</TableCell>
                            <TableCell>{subject.hoursPerWeek ? `${subject.hoursPerWeek}h` : 'Non spécifiée'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Pointage des heures */}
                <TabsContent value="workhours">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Historique des pointages</h3>
                    <Button onClick={handleAddWorkHours}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Pointer des heures
                    </Button>
                  </div>
                  
                  {isLoadingWorkHours ? (
                    <p className="text-center py-4">Chargement...</p>
                  ) : workHours.length === 0 ? (
                    <p className="text-center py-4">Aucun pointage enregistré pour ce professeur.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date et heure</TableHead>
                          <TableHead>Matière</TableHead>
                          <TableHead className="text-right">Heures</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workHours.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {format(new Date(record.date), "dd MMMM yyyy à HH:mm", { locale: fr })}
                            </TableCell>
                            <TableCell>{getSubjectName(record.subjectId)}</TableCell>
                            <TableCell className="text-right">{record.hours}h</TableCell>
                            <TableCell>{record.notes || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          ) : (
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <div className="text-muted-foreground text-center">
                  Sélectionnez un professeur dans la liste pour voir ses détails
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Dialogue d'ajout/modification de professeur */}
      <Dialog open={openTeacherDialog} onOpenChange={setOpenTeacherDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTeacher ? "Modifier le professeur" : "Ajouter un professeur"}
            </DialogTitle>
            <DialogDescription>
              {selectedTeacher 
                ? "Modifiez les informations du professeur ci-dessous" 
                : "Entrez les informations du nouveau professeur"}
            </DialogDescription>
          </DialogHeader>
          <Form {...teacherForm}>
            <form onSubmit={teacherForm.handleSubmit(onTeacherFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={teacherForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Prénom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={teacherForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={teacherForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={teacherForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="Numéro de téléphone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={teacherForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input placeholder="Adresse du professeur" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={teacherForm.control}
                name="speciality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spécialité</FormLabel>
                    <FormControl>
                      <Input placeholder="Spécialité ou domaine d'expertise" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={teacherForm.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taux horaire (FCFA)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="100" {...field} />
                    </FormControl>
                    <FormDescription>Montant payé par heure de travail</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenTeacherDialog(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialogue d'ajout d'heures travaillées */}
      <Dialog open={openWorkHoursDialog} onOpenChange={setOpenWorkHoursDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pointer des heures de travail</DialogTitle>
            <DialogDescription>
              Enregistrez les heures travaillées par {selectedTeacher?.firstName} {selectedTeacher?.lastName}
            </DialogDescription>
          </DialogHeader>
          <Form {...workHoursForm}>
            <form onSubmit={workHoursForm.handleSubmit(onWorkHoursFormSubmit)} className="space-y-4">
              <FormField
                control={workHoursForm.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre d'heures</FormLabel>
                    <FormControl>
                      <Input type="number" min="0.5" step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="py-2 px-4 mb-4 rounded-md bg-muted">
                <p className="text-sm flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Le pointage sera enregistré avec la date et l'heure actuelles : {format(new Date(), "dd/MM/yyyy à HH:mm")}
                </p>
              </div>
              
              <FormField
                control={workHoursForm.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matière</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(Number(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une matière" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getTeacherSubjects().map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name} {subject.className && ` - ${subject.className}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sélectionnez la matière concernée par ces heures de travail
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={workHoursForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notes additionnelles" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenWorkHoursDialog(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Teachers;
