import { useState, useEffect } from "react";
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
import { FileMinus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Payment, Student } from "@/types";
import StudentSearchSelect from "@/components/StudentSearchSelect";
import { useDatabase } from "@/hooks/useDatabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Helper to format YYYY-MM to 'Mois AAAA' in French
const formatMonthYear = (ym: string) => {
  if (!ym || ym.length !== 7) return "-";
  const [year, month] = ym.split("-");
  const monthsFr = [
    "",
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const m = parseInt(month, 10);
  if (isNaN(m) || m < 1 || m > 12) return ym;
  return `${monthsFr[m]} ${year}`;
};

const Payments = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Partial<Payment>>({});
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast: useToastToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const { 
    getAllPayments, 
    getAllStudents,
    getSettings,
    createPayment,
    updatePayment,
    deletePayment 
  } = useDatabase();

  const loadData = async () => {
    try {
      const [paymentsData, studentsData] = await Promise.all([
        getAllPayments(),
        getAllStudents()
      ]);
      setPayments(paymentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      useToastToast({ variant: "destructive", description: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Fetch available months from settings
    getSettings()
      .then(settings => setAvailableMonths(settings?.paymentMonths || []))
      .catch(() => setAvailableMonths([]));
  }, []);

  const handleOpenAddDialog = () => {
    let defaultMonth = "";
    if (availableMonths.length > 0) {
      defaultMonth = availableMonths[0];
    }
    setCurrentPayment({ 
      date: defaultMonth ? defaultMonth + "-01" : new Date().toISOString().split('T')[0],
      status: "paid", 
      currency: "FCFA",
      month: defaultMonth
    });
    setSelectedMonth(defaultMonth);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (payment: Payment) => {
    setCurrentPayment({ ...payment });
    setSelectedMonth(payment.month || (payment.date ? payment.date.slice(0, 7) : ""));
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (paymentId: number) => {
    setPaymentToDelete(paymentId);
    setIsDeleteDialogOpen(true);
  };

  const handleSavePayment = async () => {
    // Use selectedMonth to set the payment month (e.g., as YYYY-MM-01)
    if (!currentPayment.studentId || !selectedMonth || !currentPayment.status || currentPayment.amount === undefined) {
      useToastToast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      const paymentToSave = {
        ...currentPayment,
        month: selectedMonth,
        // Set date to the first day of the selected month if not set
        date: selectedMonth + "-01",
      };
      if (currentPayment.id) {
        await updatePayment(currentPayment.id, paymentToSave);
        useToastToast({
          title: "Succès",
          description: "Le paiement a été mis à jour avec succès."
        });
      } else {
        const newPayment = await createPayment(paymentToSave as Required<Payment>);
        setPayments([...payments, newPayment]);
        useToastToast({
          title: "Succès",
          description: "Le paiement a été ajouté avec succès."
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


  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce paiement?')) {
      try {
        await deletePayment(paymentToDelete);
        setPayments(payments.filter(p => p.id !== paymentToDelete));
        useToastToast({
          title: "Succès",
          description: "Le paiement a été supprimé avec succès."
        });
        setIsDeleteDialogOpen(false);
        loadData();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        useToastToast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression.",
          variant: "destructive"
        });
      }
    }
  };

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : "Étudiant inconnu";
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "paid":
        return "Payé";
      case "pending":
        return "En attente";
      case "overdue":
        return "En retard";
      default:
        return status;
    }
  };

  const getTypeText = (type: string): string => {
    switch (type) {
      case "tuition":
        return "Frais de scolarité";
      case "books":
        return "Livres";
      case "activities":
        return "Activités";
      case "other":
        return "Autre";
      default:
        return type;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const studentName = getStudentName(payment.studentId).toLowerCase();
    return studentName.includes(searchQuery.toLowerCase());
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <FileMinus className="mr-2 h-6 w-6" />
            Gestion des Paiements
          </h2>
          <Button onClick={handleOpenAddDialog} className="bg-school-600 hover:bg-school-700">
            Ajouter un paiement
          </Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Rechercher un étudiant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Étudiant</TableHead>
                    <TableHead className="w-1/4">Date</TableHead>
                    <TableHead className="w-1/4">Montant</TableHead>
                    <TableHead className="w-1/4">Mois payé</TableHead>
                    <TableHead className="w-1/4">Statut</TableHead>
                    <TableHead className="w-1/4">Notes</TableHead>
                    <TableHead className="w-1/4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="border-t">
                        <TableCell className="py-3 px-4 text-sm">{getStudentName(payment.studentId)}</TableCell>
                        <TableCell className="py-3 px-4 text-sm">{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell className="py-3 px-4 text-sm font-medium">{payment.amount.toFixed(2)} {payment.currency}</TableCell>
                        <TableCell className="py-3 px-4 text-sm">{formatMonthYear(payment.month || (payment.date ? payment.date.slice(0, 7) : ""))}</TableCell>
                        <TableCell className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-md ${getStatusBadgeClass(payment.status)}`}
                          >
                            {getStatusText(payment.status)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">{payment.notes || "-"}</TableCell>
                        <TableCell className="py-3 px-4 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditDialog(payment)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleOpenDeleteDialog(payment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Aucun paiement enregistré.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Payment Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {currentPayment.id ? "Modifier le paiement" : "Ajouter un paiement"}
              </DialogTitle>
              <DialogDescription>
                Entrez les informations du paiement ci-dessous.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="student">Élève</Label>
                <StudentSearchSelect
                  students={students}
                  value={currentPayment.studentId}
                  onValueChange={(studentId) =>
                    setCurrentPayment({
                      ...currentPayment,
                      studentId,
                    })
                  }
                  placeholder="Sélectionnez un élève"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (FCFA)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentPayment.amount?.toString() || ""}
                    onChange={(e) =>
                      setCurrentPayment({
                        ...currentPayment,
                        amount: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={currentPayment.date || ""}
                    onChange={(e) =>
                      setCurrentPayment({
                        ...currentPayment,
                        date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Mois</Label>
                  <Select
                    value={selectedMonth || ""}
                    onValueChange={(value) => {
                      setSelectedMonth(value);
                      setCurrentPayment({
                        ...currentPayment,
                        month: value,
                        date: value + "-01",
                      });
                    }}
                    disabled={availableMonths.length === 0}
                  >
                    <SelectTrigger id="month">
                      <SelectValue placeholder="Sélectionnez un mois" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.length > 0 ? (
                        availableMonths.map((month) => (
                          <SelectItem key={month} value={month}>
                            {formatMonthYear(month)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Aucun mois disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={currentPayment.status || "paid"}
                    onValueChange={(value) =>
                      setCurrentPayment({
                        ...currentPayment,
                        status: value as "paid" | "pending" | "overdue",
                      })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Sélectionnez un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Payé</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="overdue">En retard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={currentPayment.notes || ""}
                  onChange={(e) =>
                    setCurrentPayment({
                      ...currentPayment,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSavePayment} disabled={availableMonths.length === 0}>Enregistrer</Button>
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
            <p>Êtes-vous sûr de vouloir supprimer ce paiement?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeletePayment}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Payments;
