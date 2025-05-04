
import { useState, useEffect } from "react";
import { getPayments, getStudents, addPayment, updatePayment, deletePayment } from "@/lib/db";
import { Payment, Student } from "@/types";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Partial<Payment>>({});
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setStudents(getStudents());
    setPayments(getPayments());
  }, []);

  const handleOpenAddDialog = () => {
    setCurrentPayment({ 
      date: new Date().toISOString().split('T')[0],
      status: "paid", 
      type: "tuition" 
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (payment: Payment) => {
    setCurrentPayment({ ...payment });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (paymentId: number) => {
    setPaymentToDelete(paymentId);
    setIsDeleteDialogOpen(true);
  };

  const handleSavePayment = () => {
    if (!currentPayment.studentId || !currentPayment.date || !currentPayment.type || !currentPayment.status || currentPayment.amount === undefined) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (currentPayment.id) {
        // Update existing payment
        updatePayment(currentPayment.id, currentPayment);
        toast({
          title: "Succès",
          description: "Le paiement a été mis à jour avec succès.",
        });
      } else {
        // Add new payment
        addPayment(currentPayment as Omit<Payment, "id">);
        toast({
          title: "Succès",
          description: "Le paiement a été ajouté avec succès.",
        });
      }

      // Refresh payment list
      setPayments(getPayments());
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePayment = () => {
    if (paymentToDelete) {
      try {
        deletePayment(paymentToDelete);
        setPayments(getPayments());
        toast({
          title: "Succès",
          description: "Le paiement a été supprimé avec succès.",
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression.",
          variant: "destructive",
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setPaymentToDelete(null);
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

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-medium">Élève</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Date</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Montant</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Type</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Statut</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Notes</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length > 0 ? (
                    payments.map((payment) => (
                      <tr key={payment.id} className="border-t">
                        <td className="py-3 px-4 text-sm">{getStudentName(payment.studentId)}</td>
                        <td className="py-3 px-4 text-sm">{payment.date}</td>
                        <td className="py-3 px-4 text-sm font-medium">{payment.amount.toFixed(2)}€</td>
                        <td className="py-3 px-4 text-sm">{getTypeText(payment.type)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-md ${getStatusBadgeClass(payment.status)}`}
                          >
                            {getStatusText(payment.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{payment.notes || "-"}</td>
                        <td className="py-3 px-4 text-right space-x-2">
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
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Aucun paiement enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="student">Élève</Label>
                <Select
                  value={currentPayment.studentId?.toString() || ""}
                  onValueChange={(value) =>
                    setCurrentPayment({
                      ...currentPayment,
                      studentId: Number(value),
                    })
                  }
                >
                  <SelectTrigger id="student">
                    <SelectValue placeholder="Sélectionnez un élève" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (€)</Label>
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
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={currentPayment.type || "tuition"}
                    onValueChange={(value) =>
                      setCurrentPayment({
                        ...currentPayment,
                        type: value as "tuition" | "books" | "activities" | "other",
                      })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tuition">Frais de scolarité</SelectItem>
                      <SelectItem value="books">Livres</SelectItem>
                      <SelectItem value="activities">Activités</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
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
              <Button onClick={handleSavePayment}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </DialogHeader>
            <p>Êtes-vous sûr de vouloir supprimer ce paiement? Cette action est irréversible.</p>
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
