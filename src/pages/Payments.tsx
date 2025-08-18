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
import StudentSearchSelect from "@/components/StudentSearchSelect";
import { useDatabase } from "@/hooks/useDatabase";
import PaymentReceipt from "@/components/PaymentReceipt";
import { Skeleton } from "@/components/ui/skeleton";
import { useVirtualizer } from "@tanstack/react-virtual";

// Interfaces
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
  
  const [currentPayment, setCurrentPayment] = useState<Partial<Payment> & { student_id?: number; fee_id?: number; }>({
    date: new Date().toISOString().split('T')[0],
    method: "espèces",
  });
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolName, setSchoolName] = useState<string>("");
  
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  
  const { 
    getAllPayments, 
    getAllStudents,
    getSettings,
    createPayment,
    deletePayment,
    getAllFees,
    getLatestRegistrationForStudent,
    printReceipt,
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

  const handleOpenDeleteDialog = (paymentId: number) => {
    setPaymentToDelete(paymentId);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenReceiptDialog = (payment: Payment) => {
    setReceiptPayment(payment);
    setIsReceiptDialogOpen(true);
  };

  const handlePrintReceipt = async () => {
    if (!receiptPayment || !receiptPayment.registration) return;

    const student = students.find(s => s.id === receiptPayment.registration?.student_id);
    if (!student) {
      toast({ description: "Impossible de trouver l\'élève associé à ce paiement.", variant: "destructive" });
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

      await printReceipt({ htmlContent, printerName: settings.printerName });
      toast({ description: "Reçu imprimé avec succès." });
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      toast({ variant: "destructive", description: "Erreur lors de l\'impression du reçu." });
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
      const feesForLevel = await getAllFees({});
      setFees(feesForLevel.filter(f => f.level === null));
    }
  };

  const handleFeeChange = (feeIdStr: string) => {
    const feeId = parseInt(feeIdStr, 10);
    const selectedFee = fees.find(f => f.id === feeId);
    if (selectedFee) {
      setCurrentPayment(prev => ({ ...prev, fee_id: feeId, amount: selectedFee.amount }));
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
      toast({ title: "Erreur", description: "Cet étudiant n\'a aucune inscription valide.", variant: "destructive" });
      return;
    }

    try {
      await createPayment({ registration_id: registration.id, fee_id, amount, date, method, reference });
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

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-extrabold tracking-tight">Gestion des Paiements</h2>
          <Button onClick={handleOpenAddDialog} className="bg-accent-hot hover:bg-accent-hot/90 text-accent-hot-foreground">Ajouter un paiement</Button>
        </div>

        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher par nom..."
            type="search"
            className="pl-8 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Card>
          <CardContent className="p-4">
            {/* En-tête du tableau en divs */}
            <div className={`${gridClass} p-4 border-b font-semibold text-sm text-muted-foreground`}>
              <div className="px-2">Type</div>
              <div className="px-2">Nom</div>
              <div className="px-2">Détails</div>
              <div className="px-2">Date</div>
              <div className="px-2">Montant</div>
              <div className="px-2">Méthode</div>
              <div className="text-right px-2">Actions</div>
            </div>

            {/* Conteneur de la liste virtualisée */}
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
                            <Button variant="ghost" size="icon" disabled title="Modifier"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(payment.id)} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
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

        {/* Dialogs... */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent><DialogHeader><DialogTitle>Ajouter un paiement</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Étudiant</Label><StudentSearchSelect value={currentPayment.student_id} onValueChange={handleStudentChange} students={students.map(s => ({ id: s.id, firstName: s.first_name, lastName: s.name, className: s.className }))}/></div>{currentPayment.student_id && (<div className="space-y-2"><Label>Frais à payer</Label><Select value={currentPayment.fee_id?.toString()} onValueChange={handleFeeChange}><SelectTrigger><SelectValue placeholder="Sélectionner un frais" /></SelectTrigger><SelectContent>{fees.map(fee => (<SelectItem key={fee.id} value={fee.id.toString()}>{fee.name} - {fee.amount.toLocaleString()} FCFA</SelectItem>))}</SelectContent></Select></div>)}<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="amount">Montant à payer</Label><Input id="amount" type="number" value={currentPayment.amount || ""} onChange={(e) => setCurrentPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} /></div><div className="space-y-2"><Label htmlFor="date">Date</Label><Input id="date" type="date" value={currentPayment.date || ""} onChange={(e) => setCurrentPayment(prev => ({ ...prev, date: e.target.value }))} /></div></div><div className="space-y-2"><Label htmlFor="method">Méthode de paiement</Label><Select value={currentPayment.method || "espèces"} onValueChange={(value) => setCurrentPayment(prev => ({ ...prev, method: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="espèces">Espèces</SelectItem><SelectItem value="mobile money">Mobile Money</SelectItem><SelectItem value="chèque">Chèque</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="reference">Référence (optionnel)</Label><Textarea id="reference" value={currentPayment.reference || ""} onChange={(e) => setCurrentPayment(prev => ({ ...prev, reference: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button><Button onClick={handleSavePayment}>Enregistrer</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle><DialogDescription>Cette action est irréversible.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button><Button variant="destructive" onClick={handleDeletePayment}>Supprimer</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}><DialogContent className="min-w-[400px]"><DialogHeader><DialogTitle>Reçu de paiement</DialogTitle></DialogHeader><div className="border p-4 rounded-md">{receiptPayment && receiptPayment.registration && (<PaymentReceipt payment={receiptPayment} student={students.find(s => s.id === receiptPayment.registration?.student_id)} schoolName={schoolName} />)}</div><DialogFooter><Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Fermer</Button><Button onClick={handlePrintReceipt}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
};

export default Payments;