
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Plus, Pencil, Trash2, Book, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as api from "@/lib/api";
import { ClassWithDetails, Teacher, Subject, Schedule } from "@/types";

const Classes = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);
  
  // États pour les matières
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [selectedClassForSubject, setSelectedClassForSubject] = useState<number | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  
  // États pour les emplois du temps
  const [isAddScheduleDialogOpen, setIsAddScheduleDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState("Lundi");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  
  // États pour l'affichage des détails
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Requêtes pour charger les données
  const { data: classes = [], isLoading: isLoadingClasses, error: classesError } = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
  });
  
  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: api.getTeachers
  });
  
  const { data: classDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["class-details", expandedClassId],
    queryFn: () => expandedClassId ? api.getClassWithDetails(expandedClassId) : null,
    enabled: expandedClassId !== null
  });
  
  // Mutations pour les classes
  const addClassMutation = useMutation({
    mutationFn: api.addClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Classe ajoutée",
        description: `La classe "${className}" a été ajoutée avec succès.`
      });
      setClassName("");
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de l'ajout de la classe.",
        variant: "destructive"
      });
    }
  });
  
  const updateClassMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => 
      api.updateClass(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Classe mise à jour",
        description: `La classe a été mise à jour avec succès.`
      });
      setClassName("");
      setSelectedClass(null);
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la mise à jour de la classe.",
        variant: "destructive"
      });
    }
  });
  
  const deleteClassMutation = useMutation({
    mutationFn: (id: number) => api.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Classe supprimée",
        description: "La classe a été supprimée avec succès."
      });
      setSelectedClass(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la suppression de la classe.",
        variant: "destructive"
      });
    }
  });
  
  // Mutations pour les matières
  const addSubjectMutation = useMutation({
    mutationFn: api.addSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-details", selectedClassForSubject] });
      toast({
        title: "Matière ajoutée",
        description: `La matière "${subjectName}" a été ajoutée avec succès.`
      });
      setSubjectName("");
      setSelectedTeacher(null);
      setIsAddSubjectDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de l'ajout de la matière.",
        variant: "destructive"
      });
    }
  });
  
  // Mutations pour les emplois du temps
  const addScheduleMutation = useMutation({
    mutationFn: api.addSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-details", expandedClassId] });
      toast({
        title: "Horaire ajouté",
        description: `L'horaire a été ajouté avec succès.`
      });
      setDayOfWeek("Lundi");
      setStartTime("08:00");
      setEndTime("09:00");
      setIsAddScheduleDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de l'ajout de l'horaire.",
        variant: "destructive"
      });
    }
  });
  
  // Gestionnaires d'événements
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (className.trim()) {
      addClassMutation.mutate(className.trim());
    } else {
      toast({
        title: "Erreur",
        description: "Le nom de la classe ne peut pas être vide.",
        variant: "destructive"
      });
    }
  };
  
  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClass && className.trim()) {
      updateClassMutation.mutate({
        id: selectedClass.id,
        name: className.trim()
      });
    } else {
      toast({
        title: "Erreur",
        description: "Le nom de la classe ne peut pas être vide.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteClass = () => {
    if (selectedClass) {
      deleteClassMutation.mutate(selectedClass.id);
    }
  };
  
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassForSubject && subjectName.trim() && selectedTeacher) {
      addSubjectMutation.mutate({
        name: subjectName.trim(),
        classId: selectedClassForSubject,
        teacherId: selectedTeacher
      });
    } else {
      toast({
        title: "Erreur",
        description: "Tous les champs sont obligatoires pour ajouter une matière.",
        variant: "destructive"
      });
    }
  };
  
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubject && dayOfWeek && startTime && endTime) {
      // Vérifier que l'heure de fin est après l'heure de début
      if (startTime >= endTime) {
        toast({
          title: "Erreur",
          description: "L'heure de fin doit être après l'heure de début.",
          variant: "destructive"
        });
        return;
      }
      
      addScheduleMutation.mutate({
        subjectId: selectedSubject,
        dayOfWeek,
        startTime,
        endTime
      });
    } else {
      toast({
        title: "Erreur",
        description: "Tous les champs sont obligatoires pour ajouter un horaire.",
        variant: "destructive"
      });
    }
  };
  
  const openEditDialog = (classItem: { id: number; name: string }) => {
    setSelectedClass(classItem);
    setClassName(classItem.name);
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (classItem: { id: number; name: string }) => {
    setSelectedClass(classItem);
    setIsDeleteDialogOpen(true);
  };
  
  const openSubjectDialog = (classId: number) => {
    setSelectedClassForSubject(classId);
    setIsAddSubjectDialogOpen(true);
  };
  
  const openScheduleDialog = (subjectId: number) => {
    setSelectedSubject(subjectId);
    setIsAddScheduleDialogOpen(true);
  };
  
  const handleClassClick = (classId: number) => {
    setExpandedClassId(expandedClassId === classId ? null : classId);
  };
  
  if (classesError) {
    return (
      <MainLayout>
        <div className="bg-destructive/20 p-4 rounded-md text-destructive">
          Une erreur s'est produite lors du chargement des classes.
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestion des Classes</h1>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une classe
          </Button>
        </div>
        
        {isLoadingClasses ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {classes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6">
                  Aucune classe trouvée. Ajoutez-en une nouvelle !
                </CardContent>
              </Card>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {classes.map((classItem: { id: number; name: string }) => (
                  <AccordionItem key={classItem.id} value={`class-${classItem.id}`}>
                    <AccordionTrigger 
                      onClick={() => handleClassClick(classItem.id)}
                      className="px-4 hover:bg-muted"
                    >
                      <div className="flex justify-between items-center w-full pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{classItem.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(classItem);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(classItem);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 bg-slate-50">
                      {isLoadingDetails && expandedClassId === classItem.id ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold flex items-center">
                              <Book className="mr-2 h-5 w-5" />
                              Matières
                            </h3>
                            <Button size="sm" onClick={() => openSubjectDialog(classItem.id)}>
                              <Plus className="mr-1 h-4 w-4" />
                              Ajouter une matière
                            </Button>
                          </div>
                          
                          {classDetails && classDetails.id === classItem.id ? (
                            classDetails.subjects.length > 0 ? (
                              <div className="grid gap-4 mb-6">
                                {classDetails.subjects.map((subject) => (
                                  <Card key={subject.id}>
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-md flex items-center justify-between">
                                        <span>{subject.name}</span>
                                        <Button size="sm" onClick={() => openScheduleDialog(subject.id)}>
                                          <Clock className="mr-1 h-4 w-4" />
                                          Ajouter horaire
                                        </Button>
                                      </CardTitle>
                                      <CardDescription>
                                        Enseignant: {subject.teacher ? 
                                          `${subject.teacher.firstName} ${subject.teacher.lastName}` : 
                                          "Non assigné"
                                        }
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      {subject.schedules && subject.schedules.length > 0 ? (
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Jour</TableHead>
                                              <TableHead>Début</TableHead>
                                              <TableHead>Fin</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {subject.schedules.map((schedule) => (
                                              <TableRow key={schedule.id}>
                                                <TableCell>{schedule.dayOfWeek}</TableCell>
                                                <TableCell>{schedule.startTime}</TableCell>
                                                <TableCell>{schedule.endTime}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">Aucun horaire défini</p>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground mb-6">Aucune matière ajoutée pour cette classe.</p>
                            )
                          ) : null}
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        )}
        
        {/* Add Class Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une classe</DialogTitle>
              <DialogDescription>
                Entrez le nom de la nouvelle classe.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddClass}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="className">Nom de la classe</label>
                  <Input
                    id="className"
                    placeholder="Par exemple: Terminale S"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setClassName("");
                    setIsAddDialogOpen(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={addClassMutation.isPending}>
                  {addClassMutation.isPending ? "Ajout en cours..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Class Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier une classe</DialogTitle>
              <DialogDescription>
                Modifiez le nom de la classe.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateClass}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="editClassName">Nom de la classe</label>
                  <Input
                    id="editClassName"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setClassName("");
                    setSelectedClass(null);
                    setIsEditDialogOpen(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={updateClassMutation.isPending}>
                  {updateClassMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Class Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer une classe</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer la classe "{selectedClass?.name}" ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedClass(null);
                  setIsDeleteDialogOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteClass}
                disabled={deleteClassMutation.isPending}
              >
                {deleteClassMutation.isPending ? "Suppression..." : "Supprimer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Add Subject Dialog */}
        <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une matière</DialogTitle>
              <DialogDescription>
                Définissez les détails de la nouvelle matière.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubject}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="subjectName">Nom de la matière</label>
                  <Input
                    id="subjectName"
                    placeholder="Par exemple: Mathématiques"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="teacher">Professeur</label>
                  <Select onValueChange={(value) => setSelectedTeacher(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un professeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher: Teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSubjectName("");
                    setSelectedTeacher(null);
                    setIsAddSubjectDialogOpen(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={addSubjectMutation.isPending}>
                  {addSubjectMutation.isPending ? "Ajout en cours..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Add Schedule Dialog */}
        <Dialog open={isAddScheduleDialogOpen} onOpenChange={setIsAddScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un horaire</DialogTitle>
              <DialogDescription>
                Définissez l'horaire pour cette matière.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSchedule}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="dayOfWeek">Jour</label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="startTime">Heure de début</label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="endTime">Heure de fin</label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDayOfWeek("Lundi");
                    setStartTime("08:00");
                    setEndTime("09:00");
                    setIsAddScheduleDialogOpen(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={addScheduleMutation.isPending}>
                  {addScheduleMutation.isPending ? "Ajout en cours..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Classes;
