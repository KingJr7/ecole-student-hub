import { useState, useEffect, useRef } from "react";
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
import { FileMinus, Pencil, Printer, Receipt, Trash2, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import StudentSearchSelect from "@/components/StudentSearchSelect";
import { useDatabase } from "@/hooks/useDatabase";
import PaymentReceipt from "@/components/PaymentReceipt";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Interfaces alignées sur le schéma Prisma
interface Student {
  id: number;
  name: string;
  first_name: string;
  // autres champs si nécessaire
}

interface Registration {
  id: number;
  student_id: number;
  class_id: number;
  school_year: string;
}

interface Payment {
  id: number;
  registration_id: number;
  amount: number;
  date: string;
  method: string;
  reference?: string;
  registration?: {
    student: Student;
    class: { name: string };
  };
  // Champs ajoutés par le handler IPC
  firstName?: string;
  lastName?: string;
  className?: string;
}

const Payments = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  
  // Le paiement en cours d'édition/création
  const [currentPayment, setCurrentPayment] = useState<Partial<Payment> & { student_id?: number }>({});
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolName, setSchoolName] = useState<string>("");
  
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  const { 
    getAllPayments, 
    getAllStudents,
    getAllRegistrations,
    getSettings,
    createPayment,
    updatePayment,
    deletePayment,
  } = useDatabase();

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, studentsData, registrationsData, settingsData] = await Promise.all([
        getAllPayments(),
        getAllStudents(),
        getAllRegistrations(),
        getSettings(),
      ]);
      setPayments(paymentsData || []);
      setStudents(studentsData || []);
      setRegistrations(registrationsData || []);
      setSchoolName(settingsData?.schoolName || "Nom de l'école");
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({ variant: "destructive", description: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddDialog = () => {
    setCurrentPayment({ 
      date: new Date().toISOString().split('T')[0],
      method: "espèces",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (payment: Payment) => {
    // Pour l'édition, on retrouve le student_id à partir de la registration
    const registration = registrations.find(r => r.id === payment.registration_id);
    setCurrentPayment({ ...payment, student_id: registration?.student_id });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (paymentId: number) => {
    setPaymentToDelete(paymentId);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenReceiptDialog = (payment: Payment) => {
    setReceiptPayment(payment);
    setIsReceiptDialogOpen(true);
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Reçu</title></head><body>');
      printWindow.document.write(receiptRef.current.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleSavePayment = async () => {
    const { student_id, ...paymentData } = currentPayment;

    if (!student_id || !paymentData.amount || !paymentData.date || !paymentData.method) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }

    // Trouver la dernière inscription pour cet étudiant
    const studentRegistrations = registrations
      .filter(r => r.student_id === student_id)
      .sort((a, b) => b.id - a.id); // Trier par ID pour obtenir la plus récente

    if (studentRegistrations.length === 0) {
      toast({ title: "Erreur", description: "Cet étudiant n'a aucune inscription valide.", variant: "destructive" });
      return;
    }
    
    const registration_id = studentRegistrations[0].id;
    const finalPaymentData = { ...paymentData, registration_id };

    try {
      if (finalPaymentData.id) {
        await updatePayment(finalPaymentData.id, finalPaymentData);
        toast({ description: "Paiement mis à jour." });
      } else {
        const newPayment = await createPayment(finalPaymentData);
        toast({ description: "Paiement créé." });
        handleOpenReceiptDialog(newPayment); // Ouvre le reçu pour le nouveau paiement
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({ title: "Erreur", description: "La sauvegarde a échoué.", variant: "destructive" });
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePayment(paymentToDelete);
      toast({ description: "Paiement supprimé." });
      setIsDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({ title: "Erreur", description: "La suppression a échoué.", variant: "destructive" });
    }
  };

  const filteredPayments = payments.filter(payment => {
    const studentName = `${payment.firstName || ''} ${payment.lastName || ''}`.toLowerCase();
    return studentName.includes(searchQuery.toLowerCase());
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <Receipt className="mr-2 h-8 w-8" />
            Gestion des Paiements
          </h2>
          <Button onClick={handleOpenAddDialog} className="bg-school-600 hover:bg-school-700">
            Ajouter un paiement
          </Button>
        </div>

        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher par nom d'étudiant..."
            type="search"
            className="pl-8 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Étudiant</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10">Chargement...</TableCell></TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10">Aucun paiement trouvé.</TableCell></TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{`${payment.firstName} ${payment.lastName}`}</TableCell>
                        <TableCell>{payment.className}</TableCell>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.amount.toLocaleString()} FCFA</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>{payment.reference || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenReceiptDialog(payment)} title="Imprimer reçu"><Printer className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(payment)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(payment.id)} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentPayment.id ? "Modifier" : "Ajouter"} un paiement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Étudiant</Label>
                <StudentSearchSelect
                  value={currentPayment.student_id}
                  onValueChange={(studentId) => setCurrentPayment(prev => ({ ...prev, student_id: studentId }))}
                  students={students.map(s => ({...s, name: `${s.first_name} ${s.name}`}))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant</Label>
                  <Input id="amount" type="number" value={currentPayment.amount || ""} onChange={(e) => setCurrentPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={currentPayment.date || ""} onChange={(e) => setCurrentPayment(prev => ({ ...prev, date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Méthode de paiement</Label>
                <Select value={currentPayment.method || "espèces"} onValueChange={(value) => setCurrentPayment(prev => ({ ...prev, method: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="espèces">Espèces</SelectItem>
                    <SelectItem value="mobile money">Mobile Money</SelectItem>
                    <SelectItem value="chèque">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Référence (optionnel)</Label>
                <Textarea id="reference" value={currentPayment.reference || ""} onChange={(e) => setCurrentPayment(prev => ({ ...prev, reference: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSavePayment}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>Cette action est irréversible.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
              <Button variant="destructive" onClick={handleDeletePayment}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent className="min-w-[400px]">
            <DialogHeader>
              <DialogTitle>Reçu de paiement</DialogTitle>
            </DialogHeader>
            <div ref={receiptRef} className="border p-4 rounded-md">
              {receiptPayment && (
                <PaymentReceipt 
                  payment={receiptPayment} 
                  student={students.find(s => s.id === registrations.find(r => r.id === receiptPayment.registration_id)?.student_id)} 
                  schoolName={schoolName} 
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Fermer</Button>
              <Button onClick={handlePrintReceipt}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Payments;