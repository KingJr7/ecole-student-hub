
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, Pencil, Trash2, Search, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as api from "@/lib/api";
import { Student, Payment, ParentInfo } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the interface for the currentStudent state
interface CurrentStudent {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  enrollmentDate?: string;
  status?: 'active' | 'inactive' | 'graduated';
  className?: string;
  parentInfo?: {
    fatherName?: string;
    fatherPhone?: string;
    fatherEmail?: string;
    motherName?: string;
    motherPhone?: string;
    motherEmail?: string;
  };
}

const Students = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState<'tuition' | 'books' | 'activities' | 'other'>('tuition');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
  const [studentForPayment, setStudentForPayment] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [currentStudent, setCurrentStudent] = useState<CurrentStudent>({
    parentInfo: {
      fatherName: "",
      fatherPhone: "",
      fatherEmail: "",
      motherName: "",
      motherPhone: "",
      motherEmail: ""
    }
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use React Query to fetch data
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students'],
    queryFn: api.getStudents
  });
  
  const { data: availableClasses = [] } = useQuery({
    queryKey: ['availableClasses'],
    queryFn: api.getAvailableClasses
  });

  // Filtrer les étudiants en fonction de la recherche et de la classe sélectionnée
  const filteredStudents = students.filter((student: Student) => {
    const nameMatches = (student.firstName.toLowerCase() + " " + student.lastName.toLowerCase())
      .includes(searchQuery.toLowerCase());
    const classMatches = selectedClass === "all" || student.className === selectedClass;
    return nameMatches && classMatches;
  });
  
  // Mutations
  const addStudentMutation = useMutation({
    mutationFn: (student: Omit<Student, "id">) => api.addStudent(student),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Succès",
        description: "L'élève a été ajouté avec succès."
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive"
      });
    }
  });
  
  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Student> }) =>
      api.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Succès",
        description: "L'élève a été mis à jour avec succès."
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive"
      });
    }
  });
  
  const deleteStudentMutation = useMutation({
    mutationFn: (id: number) => api.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Succès",
        description: "L'élève a été supprimé avec succès."
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive"
      });
    }
  });
  
  const addPaymentMutation = useMutation({
    mutationFn: (payment: Omit<Payment, "id">) => api.addPayment(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({
        title: "Succès",
        description: `Paiement enregistré avec succès.`
      });
      setIsPaymentFormOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive"
      });
    }
  });

  const handleOpenAddDialog = () => {
    setCurrentStudent({
      parentInfo: {
        fatherName: "",
        fatherPhone: "",
        fatherEmail: "",
        motherName: "",
        motherPhone: "",
        motherEmail: ""
      }
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (student: Student) => {
    setCurrentStudent({ 
      ...student,
      parentInfo: student.parentInfo || {
        fatherName: "",
        fatherPhone: "",
        fatherEmail: "",
        motherName: "",
        motherPhone: "",
        motherEmail: ""
      }
    });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (studentId: number) => {
    setStudentToDelete(studentId);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenPaymentForm = (student: Student) => {
    setStudentForPayment(student);
    setPaymentAmount('');
    setPaymentType('tuition');
    setPaymentNotes('');
    setIsPaymentFormOpen(true);
  };

  const handleSaveStudent = () => {
    if (
      !currentStudent.firstName ||
      !currentStudent.lastName ||
      !currentStudent.email ||
      !currentStudent.className ||
      !currentStudent.parentInfo?.fatherName ||
      !currentStudent.parentInfo?.motherName
    ) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    // Assurez-vous que parentInfo est complètement défini
    const studentToSave: any = {
      ...currentStudent,
      parentInfo: {
        fatherName: currentStudent.parentInfo?.fatherName || "",
        fatherPhone: currentStudent.parentInfo?.fatherPhone || "",
        fatherEmail: currentStudent.parentInfo?.fatherEmail || "",
        motherName: currentStudent.parentInfo?.motherName || "",
        motherPhone: currentStudent.parentInfo?.motherPhone || "",
        motherEmail: currentStudent.parentInfo?.motherEmail || ""
      }
    };

    try {
      if (currentStudent.id) {
        // Update existing student
        updateStudentMutation.mutate({ 
          id: currentStudent.id, 
          data: studentToSave 
        });
      } else {
        // Add new student
        addStudentMutation.mutate(studentToSave as Omit<Student, "id">);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = () => {
    if (studentToDelete) {
      deleteStudentMutation.mutate(studentToDelete);
    }
  };

  const handleSubmitPayment = () => {
    if (!studentForPayment || paymentAmount === '' || paymentAmount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant de paiement valide.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newPayment: Omit<Payment, "id"> = {
        studentId: studentForPayment.id,
        amount: Number(paymentAmount),
        date: new Date().toISOString().split('T')[0],
        type: paymentType,
        status: 'paid',
        notes: paymentNotes || undefined,
        currency: 'FCFA'
      };

      addPaymentMutation.mutate(newPayment);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement du paiement.",
        variant: "destructive",
      });
    }
  };

  // Rediriger vers la page de paiements avec l'ID de l'élève
  const handleRedirectToPayment = () => {
    if (studentForPayment) {
      // Dans une application réelle, nous redirigerions vers la page de paiement
      // Pour cette démo, nous afficherons juste une notification
      toast({
        title: "Paiement",
        description: `Redirection vers la page de paiement pour ${studentForPayment.firstName} ${studentForPayment.lastName}`,
      });
    }
    setIsPaymentDialogOpen(false);
    setStudentForPayment(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <Users className="mr-2 h-6 w-6" />
            Gestion des Élèves
          </h2>
          <Button onClick={handleOpenAddDialog} className="bg-school-600 hover:bg-school-700">
            Ajouter un élève
          </Button>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom d'élève..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={selectedClass}
              onValueChange={setSelectedClass}
            >
              <SelectTrigger id="class-filter">
                <SelectValue placeholder="Filtrer par classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {availableClasses.map((className: string) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoadingStudents ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student: Student) => (
                <Card key={student.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-school-50 p-4">
                      <h3 className="font-bold text-lg">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {student.id} | Classe: {student.className}
                      </p>
                    </div>
                    <div className="p-4 space-y-2">
                      <div>
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm ml-2">{student.email}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Téléphone:</span>
                        <span className="text-sm ml-2">{student.phone}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Inscrit le:</span>
                        <span className="text-sm ml-2">{student.enrollmentDate}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Statut:</span>
                        <span className={`text-sm ml-2 ${
                          student.status === "active" ? "text-green-600" : 
                          student.status === "inactive" ? "text-red-600" : 
                          "text-amber-600"
                        }`}>
                          {student.status === "active" ? "Actif" : 
                           student.status === "inactive" ? "Inactif" : 
                           "Diplômé"}
                        </span>
                      </div>
                      <div className="pt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                            onClick={() => handleOpenPaymentForm(student)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" /> Encaisser
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditDialog(student)}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="col-span-2"
                            onClick={() => handleOpenDeleteDialog(student.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center p-8">
                <p className="text-muted-foreground">Aucun élève trouvé. Veuillez modifier vos critères de recherche ou ajouter un nouvel élève.</p>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Student Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {currentStudent.id
                  ? "Modifier l'élève"
                  : "Ajouter un nouvel élève"}
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations de l'élève et de ses parents ci-dessous.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="student" className="flex-1">Informations de l'élève</TabsTrigger>
                <TabsTrigger value="parents" className="flex-1">Informations des parents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="student">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={currentStudent.firstName || ""}
                        onChange={(e) =>
                          setCurrentStudent({
                            ...currentStudent,
                            firstName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={currentStudent.lastName || ""}
                        onChange={(e) =>
                          setCurrentStudent({
                            ...currentStudent,
                            lastName: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="className">Classe</Label>
                    <Select
                      value={currentStudent.className || ""}
                      onValueChange={(value) =>
                        setCurrentStudent({
                          ...currentStudent,
                          className: value,
                        })
                      }
                    >
                      <SelectTrigger id="className">
                        <SelectValue placeholder="Sélectionnez une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClasses.length > 0 ? (
                          availableClasses.map((className: string) => (
                            <SelectItem key={className} value={className}>
                              {className}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Terminale S">Terminale S</SelectItem>
                            <SelectItem value="Terminale ES">Terminale ES</SelectItem>
                            <SelectItem value="Terminale L">Terminale L</SelectItem>
                            <SelectItem value="Première S">Première S</SelectItem>
                            <SelectItem value="Première ES">Première ES</SelectItem>
                            <SelectItem value="Première L">Première L</SelectItem>
                            <SelectItem value="Seconde">Seconde</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentStudent.email || ""}
                      onChange={(e) =>
                        setCurrentStudent({
                          ...currentStudent,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={currentStudent.phone || ""}
                      onChange={(e) =>
                        setCurrentStudent({
                          ...currentStudent,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date de naissance</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={currentStudent.dateOfBirth || ""}
                        onChange={(e) =>
                          setCurrentStudent({
                            ...currentStudent,
                            dateOfBirth: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="enrollmentDate">Date d'inscription</Label>
                      <Input
                        id="enrollmentDate"
                        type="date"
                        value={currentStudent.enrollmentDate || ""}
                        onChange={(e) =>
                          setCurrentStudent({
                            ...currentStudent,
                            enrollmentDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={currentStudent.address || ""}
                      onChange={(e) =>
                        setCurrentStudent({
                          ...currentStudent,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select
                      value={currentStudent.status || "active"}
                      onValueChange={(value) =>
                        setCurrentStudent({
                          ...currentStudent,
                          status: value as "active" | "inactive" | "graduated",
                        })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Sélectionnez un statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                        <SelectItem value="graduated">Diplômé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="parents">
                <div className="grid gap-4 py-4">
                  <h3 className="text-lg font-medium">Informations du père</h3>
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Nom complet</Label>
                    <Input
                      id="fatherName"
                      value={currentStudent.parentInfo?.fatherName || ""}
                      onChange={(e) =>
                        setCurrentStudent({
                          ...currentStudent,
                          parentInfo: {
                            ...currentStudent.parentInfo,
                            fatherName: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fatherPhone">Téléphone</Label>
                      <Input
                        id="fatherPhone"
                        value={currentStudent.parentInfo?.fatherPhone || ""}
                        onChange={(e) =>
                          setCurrentStudent({
                            ...currentStudent,
                            parentInfo: {
                              ...currentStudent.parentInfo,
                              fatherPhone: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fatherEmail">Email</Label>
                      <Input
                        id="fatherEmail"
                        type="email"
                        value={currentStudent.parentInfo?.fatherEmail || ""}
                        onChange={(e) =>
                          setCurrentStudent({
                            ...currentStudent,
                            parentInfo: {
                              ...currentStudent.parentInfo,
                              fatherEmail: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-medium mt-4">Informations de la mère</h3>
                  <div className="space-y-2">
                    <Label htmlFor="motherName">Nom complet</Label>
                    <Input
                      id="motherName"
                      value={currentStudent.parentInfo?.motherName || ""}
                      onChange={(e) =>
                        setCurrentStudent({
                          ...currentStudent,
                          parentInfo: {
                            ...currentStudent.parentInfo,
                            motherName: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="motherPhone">Téléphone</Label>
                      <Input
                        id="motherPhone"
                        value={currentStudent.parentInfo?.motherPhone || ""}
                        onChange={(e) =>
                          setCurrentStudent({
                            ...currentStudent,
                            parentInfo: {
                              ...currentStudent.parentInfo,
                              motherPhone: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motherEmail">Email</Label>
                      <Input
                        id="motherEmail"
                        type="email"
                        value={currentStudent.parentInfo?.motherEmail || ""}
                        onChange={(e) =>
                          setCurrentStudent({
                            ...currentStudent,
                            parentInfo: {
                              ...currentStudent.parentInfo,
                              motherEmail: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveStudent}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <p>Êtes-vous sûr de vouloir supprimer cet élève?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteStudent}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Form Dialog */}
        <Dialog open={isPaymentFormOpen} onOpenChange={setIsPaymentFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Encaisser un paiement</DialogTitle>
              <DialogDescription>
                Entrez les détails du paiement à encaisser.
              </DialogDescription>
            </DialogHeader>
            {studentForPayment && (
              <div className="py-4">
                <p className="mb-4">
                  Enregistrer un paiement pour <strong>{studentForPayment.firstName} {studentForPayment.lastName}</strong> (Classe: {studentForPayment.className})
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Montant (FCFA)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Type de paiement</Label>
                    <Select
                      value={paymentType}
                      onValueChange={(value) => setPaymentType(value as 'tuition' | 'books' | 'activities' | 'other')}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Sélectionnez le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tuition">Frais de scolarité</SelectItem>
                        <SelectItem value="books">Livres et fournitures</SelectItem>
                        <SelectItem value="activities">Activités extrascolaires</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <Textarea
                      id="notes"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Entrez des notes sur ce paiement..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentFormOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitPayment}>
                Enregistrer le paiement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Old Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encaisser un paiement</DialogTitle>
              <DialogDescription>
                Confirmez l'opération de paiement.
              </DialogDescription>
            </DialogHeader>
            {studentForPayment && (
              <p>Vous allez encaisser un paiement pour {studentForPayment.firstName} {studentForPayment.lastName}.</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => {
                setIsPaymentDialogOpen(false);
                handleOpenPaymentForm(studentForPayment!);
              }}>
                Continuer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Students;
