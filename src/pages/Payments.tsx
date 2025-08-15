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

// Interfaces alignées sur les données retournées par le backend
interface Student {
  id: number;
  name: string | null;
  first_name: string | null;
  className: string | null;
}

interface Registration {
  id: number;
  student_id: number;
  class_id: number;
  school_year: string;
}

// L'interface Payment correspond maintenant à la structure aplatie renvoyée par `db:payments:getAll`
interface Payment {
  id: number;
  registration_id: number | null;
  amount: number;
  date: string;
  method: string;
  reference?: string;
  type: 'Étudiant' | 'Salaire' | 'Autre';
  person_name: string;
  details: string;
  registration?: Registration & { student: Student };
}

interface Fee {
  id: number;
  name: string;
  amount: number;
  level: string;
}

const Payments = () => {
  const db = useDatabase();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  
  const [currentPayment, setCurrentPayment] = useState<Partial<Payment> & { student_id?: number; fee_id?: number; }>({});
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolName, setSchoolName] = useState<string>("");
  
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  const { 
    getAllPayments, 
    getAllStudents,
    getSettings,
    createPayment,
    updatePayment,
    deletePayment,
    getAllFees, // Utiliser getAllFees au lieu de getFeesForLevel
    getLatestRegistrationForStudent,
    printThermalReceipt,
  } = db;

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, studentsData, settingsData] = await Promise.all([
        getAllPayments(),
        getAllStudents(),
        getSettings(),
      ]);
      setPayments(paymentsData || []);
      setStudents(studentsData || []);
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
    const student = students.find(s => s.id === payment.registration?.student.id);
    setCurrentPayment({ ...payment, student_id: student?.id });
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

  const handlePrintReceipt = async () => {
    if (!receiptPayment) return;

    const student = students.find(s => s.id === receiptPayment.registration?.student.id);
    if (!student) {
      toast({ description: "Impossible de trouver l\'élève associé à ce paiement." });
      return;
    }

    try {
      const settings = await getSettings();
      if (!settings?.printerName) {
        toast({ variant: "destructive", description: "Aucune imprimante n\'a été configurée. Veuillez en choisir une dans les paramètres." });
        return;
      }

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; margin: 0; padding: 10px; width: 300px; }
              .header { text-align: center; }
              .header h2 { margin: 0; font-size: 1.2em; }
              .header p { margin: 2px 0; font-size: 0.8em; }
              hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
              .content p { margin: 2px 0; font-size: 0.9em; }
              table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
              th, td { padding: 4px 0; }
              .total { text-align: right; font-weight: bold; font-size: 1em; }
              .footer { text-align: center; margin-top: 15px; font-size: 0.8em; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${schoolName}</h2>
            </div>
            <hr />
            <div class="content">
              <p><strong>Reçu N°:</strong> ${receiptPayment.id}</p>
              <p><strong>Date:</strong> ${new Date(receiptPayment.date).toLocaleDateString()}</p>
              <p><strong>Élève:</strong> ${student.first_name} ${student.name}</p>
            </div>
            <hr />
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Description</th>
                  <th style="text-align: right;">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${receiptPayment.details}</td>
                  <td style="text-align: right;">${receiptPayment.amount.toLocaleString()} FCFA</td>
                </tr>
              </tbody>
            </table>
            <hr />
            <p class="total">Total: ${receiptPayment.amount.toLocaleString()} FCFA</p>
            <div class="footer">
              <p>Merci de votre confiance !</p>
            </div>
          </body>
        </html>
      `;

      const result = await printReceipt({ htmlContent, printerName: settings.printerName });

      if (result.success) {
        toast({ description: "Reçu imprimé avec succès." });
      } else {
        toast({ variant: "destructive", description: "Échec de l'impression." });
      }
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      toast({ variant: "destructive", description: "Erreur lors de l'impression du reçu." });
    }
  };

  const handleStudentChange = async (studentId: number) => {
    setCurrentPayment(prev => ({ ...prev, student_id: studentId, fee_id: undefined, amount: 0 }));
    const student = students.find(s => s.id === studentId);
    if (student && student.className) {
      const studentLevel = student.className.toLowerCase().includes('primaire') ? 'primaire' : student.className.toLowerCase().includes('collège') ? 'college' : 'lycee';
      const feesForLevel = await getAllFees({ level: studentLevel });
      setFees(feesForLevel);
    } else {
      // Si l'élève n'a pas de classe, on ne charge que les frais généraux
      const feesForLevel = await getAllFees({});
      setFees(feesForLevel.filter(f => f.level === null));
    }
  };

  const handleFeeChange = (feeIdStr: string) => {
    const feeId = parseInt(feeIdStr, 10);
    const selectedFee = fees.find(f => f.id === feeId);
    if (selectedFee) {
      setCurrentPayment(prev => ({
        ...prev,
        fee_id: feeId,
        amount: selectedFee.amount, // Utiliser selectedFee.amount au lieu de selectedFee.balance
      }));
    }
  };

  const handleSavePayment = async () => {
    const { student_id, fee_id, amount, date, method, reference } = currentPayment;

    if (!student_id || !fee_id || !amount || !date || !method) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }

    const registration = await getLatestRegistrationForStudent({ studentId: student_id });
    if (!registration) {
      toast({ title: "Erreur", description: "Cet étudiant n'a aucune inscription valide.", variant: "destructive" });
      return;
    }

    const finalPaymentData = {
      registration_id: registration.id,
      fee_id,
      amount,
      date,
      method,
      reference,
    };

    try {
      const newPayment = await createPayment(finalPaymentData);
      toast({ description: "Paiement créé." });
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
    const personName = payment.person_name.toLowerCase();
    return personName.includes(searchQuery.toLowerCase());
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
                    <TableHead>Type</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Frais Payé</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10">Chargement...</TableCell></TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10">Aucun paiement trouvé.</TableCell></TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={`${payment.type}-${payment.id}`}>
                        <TableCell><span className={`px-2 py-1 rounded-full text-xs ${payment.type === 'Salaire' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{payment.type}</span></TableCell>
                        <TableCell className="font-medium">{payment.person_name}</TableCell>
                        <TableCell>{payment.type === 'Salaire' ? 'Salaire' : payment.details}</TableCell>
                        <TableCell>{payment.type === 'Salaire' ? payment.details : payment.registration?.class?.name || 'N/A'}</TableCell>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell>{(payment.amount || 0).toLocaleString()} FCFA</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center space-x-1">
                            {payment.type === 'Étudiant' && <Button variant="ghost" size="icon" onClick={() => handleOpenReceiptDialog(payment)} title="Imprimer reçu"><Printer className="h-4 w-4" /></Button>}
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
                  onValueChange={handleStudentChange}
                  students={students.map(s => ({
                    id: s.id,
                    firstName: s.first_name,
                    lastName: s.name,
                    className: s.className,
                  }))}
                />
              </div>

              {currentPayment.student_id && (
                <div className="space-y-2">
                  <Label>Frais à payer</Label>
                  <Select
                    value={currentPayment.fee_id?.toString()}
                    onValueChange={handleFeeChange}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner un frais" /></SelectTrigger>
                    <SelectContent>
                      {fees.map(fee => (
                        <SelectItem key={fee.id} value={fee.id.toString()}>
                          {fee.name} - {fee.amount.toLocaleString()} FCFA
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant à payer</Label>
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
                  student={students.find(s => s.id === receiptPayment?.registration?.student.id)} 
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