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
import { Pencil, Printer, Receipt, Trash2, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getAccessLevel, PERMISSIONS } from "@/lib/permissions";
import StudentSearchSelect from "@/components/StudentSearchSelect";
import { useDatabase } from "@/hooks/useDatabase";
import PaymentReceipt from "@/components/PaymentReceipt";
import { Skeleton } from "@/components/ui/skeleton";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

// Interfaces
interface Student {
  id: number;
  name: string | null;
  first_name: string | null;
  className: string | null;
  classLevel?: string; // Added this line
}

interface Registration {
  id: number;
  student_id: number;
  class_id: number;
  school_year: string;
  class: { name: string };
}

interface Payment {
  id: number;
  registration_id: number | null;
  amount: number;
  date: string;
  method: string;
  reference?: string;
  type: 'Étudiant' | 'Salaire';
  person_name: string;
  details: string;
  registration?: Registration & { student: Student };
  student_first_name?: string;
  student_name?: string;
  class_name?: string;
}

interface PayableFee {
  id: string; // Composite key e.g., 'single-1' or 'template-1-oct-2023'
  name: string;
  amount: number;
  balance: number;
  type: 'unique' | 'recurrent';
}

interface LatePayment {
  studentId: number;
  studentName: string;
  className: string;
  feeName: string;
  feeAmount: number;
  dueDate: string;
  balance: number;
}

const Payments = () => {
  const { user } = useAuth();
  const accessLevel = getAccessLevel(user?.role, user?.permissions, PERMISSIONS.CAN_MANAGE_PAYMENTS);
  const isReadOnly = accessLevel === 'read_only';

  const db = useDatabase();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  
  const [currentStudent, setCurrentStudent] = useState<{ id: number; registrationId: number; } | null>(null);
  // Chaque paiement est un objet avec un id unique, le feeId et le montant
  const [paymentItems, setPaymentItems] = useState([{ id: 1, feeId: '', amount: 0 }]);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [latePayments, setLatePayments] = useState<LatePayment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payableFees, setPayableFees] = useState<PayableFee[]>([]);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolName, setSchoolName] = useState<string>("");
  
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  
  const { 
    getAllPayments, 
    getLatePayments,
    getAllStudents,
    getSettings,
    createPayment,
    deletePayment,
    getStudentFeeStatus,
    getLatestRegistrationForStudent,
    printReceipt,
  } = db;

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, studentsData, settingsData, latePaymentsData] = await Promise.all([
        getAllPayments(),
        getAllStudents(),
        getSettings(),
        getLatePayments(),
      ]);
      setPayments(paymentsData || []);
      setStudents(studentsData || []);
      setSchoolName(settingsData?.schoolName || "Nom de l\'école");
      setLatePayments(latePaymentsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({ variant: "destructive", description: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!receiptPayment) return;
    const studentFullName = `${receiptPayment.student_first_name || ''} ${receiptPayment.student_name || ''}`.trim();
    if (!studentFullName) {
      toast({ description: "Impossible de trouver le nom de l'élève pour ce paiement.", variant: "destructive" });
      return;
    }

    try {
      const settings = await getSettings();
      if (!settings?.printerName) {
        toast({ variant: "destructive", description: "Aucune imprimante n'a été configurée. Veuillez en choisir une dans les paramètres." });
        return;
      }

      const htmlContent = `
        <html>
          <head><style>body{font-family:sans-serif;margin:0;padding:10px;width:300px}.header{text-align:center}.header h2{margin:0;font-size:1.2em}.header p{margin:2px 0;font-size:.8em}hr{border:none;border-top:1px dashed #000;margin:10px 0}.content p{margin:2px 0;font-size:.9em}table{width:100%;border-collapse:collapse;font-size:.9em}th,td{padding:4px 0}.total{text-align:right;font-weight:bold;font-size:1em}.footer{text-align:center;margin-top:15px;font-size:.8em}</style></head>
          <body>
            <div class="header"><h2>${schoolName}</h2></div><hr />
            <div class="content">
              <p><strong>Reçu N°:</strong> ${receiptPayment.id}</p>
              <p><strong>Date:</strong> ${new Date(receiptPayment.date).toLocaleDateString()}</p>
              <p><strong>Élève:</strong> ${studentFullName}</p>
              <p><strong>Classe:</strong> ${receiptPayment.class_name || 'Non spécifiée'}</p>
            </div><hr />
            <table>
              <thead><tr><th style="text-align:left;">Description</th><th style="text-align:right;">Montant</th></tr></thead>
              <tbody><tr><td>${receiptPayment.details}</td><td style="text-align:right;">${receiptPayment.amount.toLocaleString()} FCFA</td></tr></tbody>
            </table><hr />
            <p class="total">Total: ${receiptPayment.amount.toLocaleString()} FCFA</p>
            <div class="footer"><p>Merci de votre confiance !</p></div>
          </body>
        </html>
      `;

      await printReceipt({ htmlContent, printerName: settings.printerName });
      toast({ description: "Reçu imprimé avec succès." });
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      toast({ variant: "destructive", description: "Erreur lors de l\'impression du reçu." });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddDialog = () => {
    setCurrentStudent(null);
    setPaymentItems([{ id: 1, feeId: '', amount: 0 }]);
    setPayableFees([]);
    setIsDialogOpen(true);
  };

  const handleStudentChange = async (studentId: number) => {
    setPaymentItems([{ id: 1, feeId: '', amount: 0 }]);
    if (!studentId) {
      setCurrentStudent(null);
      setPayableFees([]);
      return;
    }

    const registration = await getLatestRegistrationForStudent({ studentId });
    if (registration) {
      setCurrentStudent({ id: studentId, registrationId: registration.id });
      const student = students.find(s => s.id === studentId);
      const feeStatuses = await getStudentFeeStatus({ 
        registrationId: registration.id,
        level: student?.classLevel,
        classId: registration.class_id
      });
      const feesToPay = feeStatuses.filter(fee => fee.balance > 0);
      setPayableFees(feesToPay);
    } else {
      setCurrentStudent(null);
      setPayableFees([]);
      toast({ description: "Cet étudiant n'a pas d'inscription valide.", variant: "destructive" });
    }
  };

  const handlePaymentItemChange = (itemId, field, value) => {
    setPaymentItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        // Si le frais change, mettre à jour le montant avec le solde
        if (field === 'feeId') {
          const fee = payableFees.find(f => f.id === value);
          updatedItem.amount = fee ? fee.balance : 0;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addPaymentItem = () => {
    setPaymentItems(prev => [...prev, { id: Date.now(), feeId: '', amount: 0 }]);
  };

  const removePaymentItem = (itemId) => {
    setPaymentItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSavePayment = async () => {
    if (!currentStudent) {
      toast({ title: "Erreur", description: "Aucun étudiant sélectionné.", variant: "destructive" });
      return;
    }

    const paymentPromises = paymentItems
      .filter(item => item.feeId && item.amount > 0)
      .map(item => {
        const fee = payableFees.find(f => f.id === item.feeId);
        if (!fee) return null;

        let paymentData: any = {
          registration_id: currentStudent.registrationId,
          amount: item.amount,
          date: new Date().toISOString().split('T')[0],
          method: "espèces", // ou à partir d'un champ de formulaire global
        };

        if (fee.type === 'unique') {
          paymentData.single_fee_id = parseInt(fee.id.replace('single-', ''), 10);
        } else if (fee.type === 'recurrent') {
          const [_, templateId, ...periodParts] = fee.id.split('-');
          paymentData.fee_template_id = parseInt(templateId, 10);
          paymentData.period_identifier = periodParts.join('-');
        }
        return createPayment(paymentData);
      })
      .filter(Boolean);

    if (paymentPromises.length === 0) {
      toast({ description: "Aucun paiement valide à enregistrer." });
      return;
    }

    try {
      await Promise.all(paymentPromises);
      toast({ description: `${paymentPromises.length} paiement(s) enregistré(s) avec succès.` });
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paiements:', error);
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

  const filteredPayments = payments.filter(payment => 
    payment.person_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredPayments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, // Hauteur d'une ligne p-4 + border
    overscan: 5,
  });

  const gridClass = "grid grid-cols-[8%_20%_22%_10%_15%_10%_15%] items-center";
  const lateGridClass = "grid grid-cols-[20%_15%_20%_15%_15%_15%] items-center";

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-extrabold tracking-tight">Gestion des Paiements</h2>
          {!isReadOnly && <Button onClick={handleOpenAddDialog} className="bg-accent-hot hover:bg-accent-hot/90 text-accent-hot-foreground">Ajouter un paiement</Button>}
        </div>

        <Tabs defaultValue="all_payments">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all_payments">Tous les paiements</TabsTrigger>
            <TabsTrigger value="late_payments">
              Paiements en retard
              {latePayments.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{latePayments.length}</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all_payments">
            <div className="relative w-full md:max-w-md mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher par nom..."
                type="search"
                className="pl-8 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className={`${gridClass} p-4 border-b font-semibold text-sm text-muted-foreground`}>
                  <div className="px-2">Type</div>
                  <div className="px-2">Nom</div>
                  <div className="px-2">Détails</div>
                  <div className="px-2">Date</div>
                  <div className="px-2">Montant</div>
                  <div className="px-2">Méthode</div>
                  <div className="text-right px-2">Actions</div>
                </div>

                <div ref={parentRef} className="h-[600px] overflow-y-auto relative">
                  {loading ? (
                    <div className="p-4">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className={`${gridClass} py-2`}>
                          <Skeleton className="h-5 w-full"/>
                          <Skeleton className="h-5 w-full"/>
                          <Skeleton className="h-5 w-full"/>
                          <Skeleton className="h-5 w-full"/>
                          <Skeleton className="h-5 w-full"/>
                          <Skeleton className="h-5 w-full"/>
                          <div className="flex justify-end"><Skeleton className="h-8 w-20"/></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const payment = filteredPayments[virtualRow.index];
                        return (
                          <div key={virtualRow.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }} className={`${gridClass} p-4 border-b text-sm`}>
                            <div className="px-2"><span className={`px-2 py-1 rounded-full text-xs ${payment.type === 'Salaire' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{payment.type}</span></div>
                            <div className="font-medium truncate px-2">{payment.person_name}</div>
                            <div className="text-muted-foreground truncate px-2">{payment.details}</div>
                            <div className="text-muted-foreground px-2">{new Date(payment.date).toLocaleDateString()}</div>
                            <div className="font-semibold px-2">{(payment.amount || 0).toLocaleString()} FCFA</div>
                            <div className="text-muted-foreground px-2">{payment.method}</div>
                            <div className="text-right px-2">
                              <div className="flex justify-end items-center">
                                {payment.type === 'Étudiant' && <Button variant="ghost" size="icon" onClick={() => handleOpenReceiptDialog(payment)} title="Imprimer reçu"><Printer className="h-4 w-4" /></Button>}
                                {!isReadOnly && payment.type === 'Étudiant' && <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(payment)} title="Modifier"><Pencil className="h-4 w-4" /></Button>}
                                {!isReadOnly && <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(payment.id)} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="late_payments">
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className={`${lateGridClass} p-4 border-b font-semibold text-sm text-muted-foreground`}>
                  <div className="px-2">Élève</div>
                  <div className="px-2">Classe</div>
                  <div className="px-2">Frais concerné</div>
                  <div className="px-2">Date d'échéance</div>
                  <div className="px-2">Montant total</div>
                  <div className="px-2 text-red-600">Solde restant</div>
                </div>
                <div className="h-[600px] overflow-y-auto relative">
                  {loading ? (
                     [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full mt-2 rounded-md"/>)
                  ) : latePayments.length > 0 ? (
                    latePayments.map((payment) => (
                      <div key={`${payment.studentId}-${payment.feeName}`} className={`${lateGridClass} p-4 border-b text-sm`}>
                        <Link to={`/students/${payment.studentId}`} className="font-medium truncate px-2 text-primary hover:underline">{payment.studentName}</Link>
                        <div className="text-muted-foreground truncate px-2">{payment.className}</div>
                        <div className="text-muted-foreground truncate px-2">{payment.feeName}</div>
                        <div className="text-muted-foreground px-2">{new Date(payment.dueDate).toLocaleDateString()}</div>
                        <div className="font-semibold px-2">{(payment.feeAmount || 0).toLocaleString()} FCFA</div>
                        <div className="font-semibold text-red-600 px-2">{(payment.balance || 0).toLocaleString()} FCFA</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <Receipt className="mx-auto h-12 w-12" />
                      <h3 className="mt-4 text-lg font-semibold">Aucun paiement en retard</h3>
                      <p className="mt-2 text-sm">Tous les élèves sont à jour dans leurs paiements.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs... */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Encaisser un paiement</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4 min-h-[500px]">
              <div className="space-y-2">
                <Label>Étudiant</Label>
                <StudentSearchSelect 
                  disabled={isReadOnly}
                  value={currentStudent?.id}
                  onValueChange={handleStudentChange} 
                  students={students.map(s => ({ id: s.id, firstName: s.first_name, lastName: s.name, className: s.className }))}
                />
              </div>
              {currentStudent && (
                <div className="space-y-4 pt-4">
                  <h4 className="font-medium">Frais à payer</h4>
                  <div className="space-y-3">
                    {paymentItems.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Select 
                          value={item.feeId}
                          onValueChange={(value) => handlePaymentItemChange(item.id, 'feeId', value)}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner un frais" /></SelectTrigger>
                          <SelectContent>
                            {payableFees.map(fee => (
                              <SelectItem key={fee.id} value={fee.id} disabled={paymentItems.some(p => p.feeId === fee.id && p.id !== item.id)}>
                                {fee.name} ({fee.balance.toLocaleString()} FCFA)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input 
                          type="number"
                          placeholder="Montant"
                          value={item.amount || ''}
                          onChange={(e) => handlePaymentItemChange(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-48"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removePaymentItem(item.id)} disabled={paymentItems.length === 1}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={addPaymentItem}>Ajouter un frais</Button>
                  <div className="flex justify-end items-center pt-4 border-t">
                      <span className="text-lg font-semibold">Total à payer :</span>
                      <span className="text-xl font-bold ml-4">
                        {paymentItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()} FCFA
                      </span>
                  </div>
                </div>
              )}
            </div>
            {!isReadOnly && 
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleSavePayment}>Enregistrer le Paiement</Button>
              </DialogFooter>}
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle><DialogDescription>Cette action est irréversible.</DialogDescription></DialogHeader>
        {!isReadOnly && <DialogFooter><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button><Button variant="destructive" onClick={handleDeletePayment}>Supprimer</Button></DialogFooter>}
        </DialogContent></Dialog>
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}><DialogContent className="min-w-[400px]"><DialogHeader><DialogTitle>Reçu de paiement</DialogTitle></DialogHeader><div className="border p-4 rounded-md">{receiptPayment && receiptPayment.registration && (
            <PaymentReceipt 
              payment={receiptPayment} 
              student={{
                id: receiptPayment.registration.student_id,
                firstName: receiptPayment.student_first_name,
                lastName: receiptPayment.student_name,
                className: receiptPayment.class_name
              }} 
              schoolName={schoolName} 
            />
          )}</div><DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Fermer</Button><Button onClick={handlePrintReceipt}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
};

export default Payments;