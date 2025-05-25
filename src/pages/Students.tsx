import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Student, Payment } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatabase } from "@/hooks/useDatabase";
// import { toast } from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast: useToastToast } = useToast();
  const queryClient = useQueryClient();
  const { 
    getAllStudents, 
    createStudent, 
    getAllClasses,
    createPayment,
    updateStudent,
    deleteStudent
  } = useDatabase();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsData, classesData] = await Promise.all([
        getAllStudents(),
        getAllClasses()
      ]);
      
      // Ajouter le nom de la classe à chaque étudiant
      const studentsWithClassNames = studentsData.map(student => {
        const studentClass = classesData.find(c => c.id === student.classId);
        return {
          ...student,
          className: studentClass?.name || ''
        };
      });
      
      setStudents(studentsWithClassNames);
      setClasses(classesData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      useToastToast({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement des données.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les étudiants en fonction de la recherche et de la classe sélectionnée
  const filteredStudents = students.filter((student: Student) => {
    const nameMatches = (student.firstName.toLowerCase() + " " + student.lastName.toLowerCase())
      .includes(searchQuery.toLowerCase());
    const classMatches = selectedClass === "all" || student.className === selectedClass;
    return nameMatches && classMatches;
  });

  const handleSaveStudent = async () => {
    if (
      !currentStudent.firstName ||
      !currentStudent.lastName ||
      !currentStudent.email ||
      !currentStudent.className ||
      !currentStudent.parentInfo?.fatherName ||
      !currentStudent.parentInfo?.motherName
    ) {
      useToastToast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires, y compris la classe.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Trouver l'ID de la classe sélectionnée
      const selectedClass = classes.find(c => c.name === currentStudent.className);
      if (!selectedClass) {
        useToastToast({
          title: "Erreur",
          description: "Classe invalide sélectionnée.",
          variant: "destructive",
        });
        return;
      }

      const studentData = {
        firstName: currentStudent.firstName,
        lastName: currentStudent.lastName,
        email: currentStudent.email,
        phone: currentStudent.phone || '',
        dateOfBirth: currentStudent.dateOfBirth || new Date().toISOString(),
        address: currentStudent.address || '',
        enrollmentDate: currentStudent.enrollmentDate || new Date().toISOString(),
        status: currentStudent.status || 'active',
        classId: selectedClass.id,
        parentInfo: currentStudent.parentInfo
      };

      if (currentStudent.id) {
        // Update existing student
        await updateStudent(currentStudent.id, studentData);
        useToastToast({
          title: "Succès",
          description: "Étudiant mis à jour avec succès.",
        });
      } else {
        // Create new student
        const newStudent = await createStudent(studentData);
        setStudents([...students, { ...newStudent, className: selectedClass.name }]);
        useToastToast({
          title: "Succès",
          description: "Étudiant créé avec succès.",
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      useToastToast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ?')) {
      try {
        await deleteStudent(studentToDelete);
        setStudents(students.filter(s => s.id !== studentToDelete));
        // toast.success('Étudiant supprimé avec succès');
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        // toast.error('Une erreur est survenue lors de la suppression.');
      }
    }
  };

  const handleSubmitPayment = async () => {
    if (!studentForPayment || !paymentAmount) return;

    try {
      const paymentData = {
        studentId: studentForPayment.id,
        amount: Number(paymentAmount),
        date: new Date().toISOString(),
        type: paymentType,
        status: 'paid',
        notes: paymentNotes,
        currency: 'FCFA'
      };

      await createPayment(paymentData);
      // toast.success('Le paiement a été enregistré avec succès');
      setIsPaymentFormOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du paiement:', error);
      // toast.error('Une erreur est survenue lors de l\'enregistrement du paiement.');
    }
  };

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
    const selectedClass = classes.find(c => c.id === student.classId);
    setCurrentStudent({ 
      ...student,
      className: selectedClass?.name || '',
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

  // Rediriger vers la page de paiements avec l'ID de l'élève
  const handleRedirectToPayment = () => {
    if (studentForPayment) {
      // Dans une application réelle, nous redirigerions vers la page de paiement
      // Pour cette démo, nous afficherons juste une notification
      // toast({
      //   title: "Paiement",
      //   description: `Redirection vers la page de paiement pour ${studentForPayment.firstName} ${studentForPayment.lastName}`,
      // });
    }
    setIsPaymentDialogOpen(false);
    setStudentForPayment(null);
  };

  const getClassName = (classId: number) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? cls.name : 'Classe inconnue';
  };

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'Actif',
      'inactive': 'Inactif',
      'graduated': 'Diplômé',
      'suspended': 'Suspendu'
    };
    return statusMap[status] || status;
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
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.name}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
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
                          {formatStatus(student.status)}
                        </span>
                      </div>
                      <div className="pt-2">
                        <div className="grid grid-cols-2 gap-2">
        
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
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.name}>
                            {cls.name}
                          </SelectItem>
                        ))}
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
                          address: e.target.value
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
