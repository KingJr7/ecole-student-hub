import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Edit, Trash, Save, Users, DollarSign, Briefcase, Home, Printer, History, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDatabase } from "@/hooks/useDatabase";

import { useAuth } from "@/context/AuthContext";
import { getAccessLevel, PERMISSIONS } from "@/lib/permissions";

import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, paySalary, getSettings, getSalaryHistory, getEmployeeStats } from "@/lib/api";
import { Employee, SalaryPayment } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const employeeFormSchema = z.object({
  first_name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  password: z.string().optional(),
  adress: z.string().optional(),
  job_title: z.string().min(2, "Le poste est requis"),
  salary: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, "Le salaire doit être positif")
  ),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

const EmployeesPage = () => {
  const { user } = useAuth();
  const accessLevel = getAccessLevel(user?.role, user?.permissions, PERMISSIONS.CAN_MANAGE_EMPLOYEES);
  const isReadOnly = accessLevel === 'read_only';

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [settings, setSettings] = useState(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const db = useDatabase();

  useState(() => {
    const fetchSchoolData = async () => {
      const settingsData = await db.getSettings();
      const logoData = await db.getSchoolLogoBase64();
      setSettings(settingsData);
      setSchoolLogo(logoData);
    };
    fetchSchoolData();
  }, [db]);

  const downloadEmployeesPDF = () => {
    const doc = new jsPDF();
    const schoolName = settings?.schoolName || "Mon École";

    // En-tête
    if (schoolLogo) {
      doc.addImage(schoolLogo, 'WEBP', 14, 10, 25, 25);
    }
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, 105, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text("Liste du Personnel", 105, 28, { align: 'center' });

    // Tableau
    const head = [['Nom', 'Prénom', 'Poste', 'Adresse', 'Téléphone']];
    const body = employees.map(e => [
      e.name,
      e.first_name,
      e.job_title,
      e.adress || '-',
      e.phone
    ]);

    autoTable(doc, {
      startY: 40,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`liste_personnel.pdf`);
  };

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const { data: stats, isLoading: isLoadingStats } = useQuery({ queryKey: ["employeeStats"], queryFn: getEmployeeStats });
  const { data: salaryHistory = [], isLoading: isLoadingHistory } = useQuery({ queryKey: ["salaryHistory", selectedEmployee?.id], queryFn: () => getSalaryHistory(selectedEmployee!.id), enabled: !!selectedEmployee });

  const addEmployeeMutation = useMutation({ mutationFn: addEmployee, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); queryClient.invalidateQueries({ queryKey: ["employeeStats"] }); toast({ title: "Employé ajouté" }); setOpenEmployeeDialog(false); }, onError: (error) => { toast({ title: "Erreur", description: error.message, variant: "destructive" }); } });
  const updateEmployeeMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) => updateEmployee(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); queryClient.invalidateQueries({ queryKey: ["employeeStats"] }); toast({ title: "Employé mis à jour" }); setOpenEmployeeDialog(false); }, onError: (error) => { toast({ title: "Erreur", description: error.message, variant: "destructive" }); } });
  const deleteEmployeeMutation = useMutation({ mutationFn: deleteEmployee, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); queryClient.invalidateQueries({ queryKey: ["employeeStats"] }); toast({ title: "Employé supprimé" }); setSelectedEmployee(null); }, onError: (error) => { toast({ title: "Erreur", description: error.message, variant: "destructive" }); } });
  const paySalaryMutation = useMutation({ mutationFn: paySalary, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salaryHistory", selectedEmployee?.id] }); toast({ title: "Salaire payé" }); setOpenPayDialog(false); }, onError: (error) => { toast({ title: "Erreur", description: error.message, variant: "destructive" }); } });

  const employeeForm = useForm<EmployeeFormValues>({ resolver: zodResolver(employeeFormSchema) });
  const paySalaryForm = useForm({ defaultValues: { bonus: 0, notes: "" } });

  const onEmployeeFormSubmit: SubmitHandler<EmployeeFormValues> = (data) => {
    const employeeData: Partial<EmployeeFormValues> = { ...data, gender: 'Non spécifié' };
    if (!data.password) {
      delete employeeData.password;
    }

    if (selectedEmployee) {
      updateEmployeeMutation.mutate({ id: selectedEmployee.id, data: employeeData });
    } else {
      addEmployeeMutation.mutate(employeeData as Employee);
    }
  };

  const generatePayslip = async (employee: Employee, payment: SalaryPayment) => {
    const settings = await getSettings();
    const printWindow = window.open('', '', 'height=800,width=600');
    const payslipHTML = `
      <html>
        <head><title>Fiche de Paie - ${employee.first_name} ${employee.name}</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:20px;background-color:#f9f9f9;color:#333}.payslip-container{background-color:white;max-width:800px;margin:auto;padding:40px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08)}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4a4a4a;padding-bottom:20px;margin-bottom:20px}.school-info h2{margin:0;font-size:24px}.school-info p{margin:5px 0 0;color:#666}.payslip-title{text-align:right}.payslip-title h1{margin:0;font-size:28px;color:#4a4a4a}.payslip-title p{margin:5px 0 0;color:#666}.employee-details{background-color:#f2f2f2;padding:15px;border-radius:6px;margin-bottom:30px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.employee-details p{margin:5px 0;font-size:14px}.employee-details strong{color:#4a4a4a}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:12px 15px;text-align:left;border-bottom:1px solid #e0e0e0}thead th{background-color:#f2f2f2;font-weight:600;font-size:14px}.line-item td{font-size:15px}.totals-section{margin-top:20px}.net-pay{background-color:#4a4a4a;color:white;font-size:18px;font-weight:bold}.net-pay td{padding:15px}.footer{text-align:center;margin-top:50px;font-size:12px;color:#888}</style></head>
        <body><div class="payslip-container"><div class="header"><div class="school-info"><h2>${settings?.schoolName || 'Ntik School'}</h2><p>${settings?.schoolAddress || 'Adresse non configurée'}</p></div><div class="payslip-title"><h1>Fiche de Paie</h1><p><strong>Date:</strong> ${new Date(payment.payment_date).toLocaleDateString('fr-FR')}</p></div></div><div class="employee-details"><div><p><strong>Employé:</strong></p><p>${employee.first_name} ${employee.name}</p></div><div><p><strong>Matricule:</strong></p><p>${employee.matricule}</p></div><div><p><strong>Poste:</strong></p><p>${employee.job_title}</p></div><div><p><strong>Période de paie:</strong></p><p>${new Date(payment.payment_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p></div></div><table><thead><tr><th>Description</th><th style="text-align:right;">Montant</th></tr></thead><tbody><tr class="line-item"><td>Salaire de base</td><td style="text-align:right;">${payment.base_salary.toLocaleString('fr-FR')} FCFA</td></tr><tr class="line-item"><td>Prime</td><td style="text-align:right;">${payment.bonus_amount.toLocaleString('fr-FR')} FCFA</td></tr><tr class="line-item"><td><i>${payment.notes || ''}</i></td><td></td></tr></tbody><tfoot><tr class="net-pay"><td>Net à Payer</td><td style="text-align:right;">${payment.total_amount.toLocaleString('fr-FR')} FCFA</td></tr></tfoot></table><div class="footer"><p>Ceci est une fiche de paie générée automatiquement.</p></div></div></body></html>`;
    printWindow.document.write(payslipHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const handlePaySalary = (data) => {
    if (selectedEmployee) {
      const paymentDate = new Date().toISOString().split('T')[0];
      paySalaryMutation.mutate({ employee_id: selectedEmployee.id, base_salary: selectedEmployee.salary, bonus_amount: parseFloat(data.bonus) || 0, payment_date: paymentDate, notes: data.notes });
    }
  };

  const handleEditEmployee = (employee: Employee) => { setSelectedEmployee(employee); employeeForm.reset({...employee, password: ''}); setOpenEmployeeDialog(true); };
  const handleDeleteEmployee = (id: number) => { if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) { deleteEmployeeMutation.mutate(id); } };
  const handleNewEmployee = () => { setSelectedEmployee(null); employeeForm.reset({ first_name: "", name: "", email: "", phone: "", password: "", adress: "", job_title: "", salary: 0 }); setOpenEmployeeDialog(true); };

  const HistoryTableSkeleton = () => (
    <>
        {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-24 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32 rounded-md" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
            </TableRow>
        ))}
    </>
  );

  return (
    <MainLayout>
        <div className="space-y-8 p-4 pt-6 md:p-8">
            <h2 className="text-4xl font-extrabold tracking-tight">Gestion du Personnel</h2>
            <div className="grid gap-4 md:grid-cols-2">
                {isLoadingStats ? (
                    <><Card><CardHeader><Skeleton className="h-6 w-3/4"/></CardHeader><CardContent><Skeleton className="h-8 w-1/2"/></CardContent></Card></>
                ) : (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total du Personnel</CardTitle><Users className="h-4 w-4 text-muted-foreground"/></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{stats?.totalEmployees}</div></CardContent>
                    </Card>
                )}
                {isLoadingStats ? (
                    <><Card><CardHeader><Skeleton className="h-6 w-3/4"/></CardHeader><CardContent><Skeleton className="h-8 w-1/2"/></CardContent></Card></>
                ) : (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Masse Salariale Mensuelle (Prévue)</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{stats?.monthlyPayroll.toLocaleString()} FCFA</div></CardContent>
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card className="md:col-span-1 h-fit">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Liste du Personnel</CardTitle>
                    <CardDescription>Sélectionnez un employé pour voir ses détails</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={downloadEmployeesPDF} size="sm" variant="outline"><Download className="mr-2 h-4 w-4" />Imprimer</Button>
                    {!isReadOnly && <Button onClick={handleNewEmployee} size="sm" className="bg-accent-hot hover:bg-accent-hot/90 text-accent-hot-foreground"><PlusCircle className="mr-2 h-4 w-4" />Nouveau</Button>}
                  </div>
                </CardHeader>
                <CardContent>
                    {isLoadingEmployees ? (
                    <div className="space-y-2 animate-pulse">
                        {[...Array(5)].map((_, i) => (<div key={i} className="flex items-center justify-between p-3 border rounded-md"><div><Skeleton className="h-5 w-32 rounded-md" /><Skeleton className="h-4 w-24 mt-2 rounded-md" /></div><div className="flex space-x-1"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></div>))}
                    </div>
                    ) : (
                    <div className="space-y-2">
                        {employees.map((employee) => (<div key={employee.id} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${selectedEmployee?.id === employee.id ? "bg-muted" : ""}`} onClick={() => setSelectedEmployee(employee)}><div><h3 className="font-medium">{employee.first_name} {employee.name}</h3><p className="text-sm text-muted-foreground">{employee.job_title}</p></div>
                        {!isReadOnly && <div className="flex space-x-1"><Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditEmployee(employee); }}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(employee.id); }}><Trash className="h-4 w-4" /></Button></div>}
                        </div>))}
                    </div>
                    )}
                </CardContent>
                </Card>

                <div className="md:col-span-2 space-y-6">
                {selectedEmployee ? (
                    <>
                    <Card>
                        <CardHeader>
                        <CardTitle className="text-3xl font-bold">{selectedEmployee.first_name} {selectedEmployee.name}</CardTitle>
                        <CardDescription>Matricule: {selectedEmployee.matricule}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="p-4 border rounded-lg"><h4 className="font-semibold flex items-center mb-2"><Briefcase className="mr-2 h-5 w-5"/>Poste</h4><p className="text-lg">{selectedEmployee.job_title}</p></div>
                            <div className="p-4 border rounded-lg"><h4 className="font-semibold flex items-center mb-2"><DollarSign className="mr-2 h-5 w-5"/>Salaire Mensuel</h4><p className="text-lg">{selectedEmployee.salary?.toLocaleString() || "0"} FCFA</p></div>
                        </div>
                        <div className="text-sm text-muted-foreground pt-2">
                            <p className="flex items-center"><Home className="mr-2 h-4 w-4"/> {selectedEmployee.adress || 'Adresse non renseignée'}</p>
                            <p>{selectedEmployee.email} | {selectedEmployee.phone}</p>
                        </div>
                        {!isReadOnly && <div className="pt-4"><Button onClick={() => setOpenPayDialog(true)}>Payer le salaire</Button></div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center"><History className="mr-2 h-5 w-5"/> Historique des Paiements</CardTitle></CardHeader>
                        <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Salaire Base</TableHead><TableHead>Prime</TableHead><TableHead>Total</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {isLoadingHistory ? <HistoryTableSkeleton /> : 
                            salaryHistory.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4">Aucun paiement enregistré.</TableCell></TableRow> : 
                            salaryHistory.map((payment) => (
                                <TableRow key={payment.id}>
                                <TableCell>{new Date(payment.payment_date).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell>{payment.base_salary.toLocaleString()} FCFA</TableCell>
                                <TableCell>{payment.bonus_amount.toLocaleString()} FCFA</TableCell>
                                <TableCell className="font-semibold">{payment.total_amount.toLocaleString()} FCFA</TableCell>
                                <TableCell>{payment.notes || '-'}</TableCell>
                                <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => generatePayslip(selectedEmployee, payment)}><Printer className="h-4 w-4"/></Button></TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </CardContent>
                    </Card>
                    </>
                ) : (
                    <Card className="flex flex-col items-center justify-center py-12 h-full">
                    <CardContent className="text-center">
                        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">Gestion du Personnel</h3>
                        <p className="text-muted-foreground">Sélectionnez un employé pour voir ses détails et son historique.</p>
                    </CardContent>
                    </Card>
                )}
                </div>
            </div>
        </div>

      <Dialog open={openEmployeeDialog} onOpenChange={setOpenEmployeeDialog}><DialogContent><DialogHeader><DialogTitle>{selectedEmployee ? "Modifier" : "Ajouter"} un employé</DialogTitle></DialogHeader><Form {...employeeForm}><form onSubmit={employeeForm.handleSubmit(onEmployeeFormSubmit)} className="space-y-4 py-4"><div className="grid grid-cols-2 gap-4"><FormField control={employeeForm.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input disabled={isReadOnly} {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={employeeForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input disabled={isReadOnly} {...field} /></FormControl><FormMessage /></FormItem>)} /></div><FormField control={employeeForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input disabled={isReadOnly} type="email" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={employeeForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input disabled={isReadOnly} {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={employeeForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Mot de passe (optionnel)</FormLabel><FormControl><Input disabled={isReadOnly} type="password" placeholder={selectedEmployee ? "Laisser vide pour ne pas changer" : "Laisser vide pour mot de passe par défaut"} {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={employeeForm.control} name="adress" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input disabled={isReadOnly} {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={employeeForm.control} name="job_title" render={({ field }) => (<FormItem><FormLabel>Poste</FormLabel><FormControl><Input disabled={isReadOnly} {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={employeeForm.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salaire (FCFA)</FormLabel><FormControl><Input disabled={isReadOnly} type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
              {!isReadOnly && <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenEmployeeDialog(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></DialogFooter>}
              </form></Form></DialogContent></Dialog>
      <Dialog open={openPayDialog} onOpenChange={setOpenPayDialog}><DialogContent><DialogHeader><DialogTitle>Payer le salaire de {selectedEmployee?.first_name} {selectedEmployee?.name}</DialogTitle><DialogDescription>Salaire de base: {selectedEmployee?.salary?.toLocaleString()} FCFA</DialogDescription></DialogHeader><Form {...paySalaryForm}><form onSubmit={paySalaryForm.handleSubmit(handlePaySalary)} className="space-y-4"><FormField control={paySalaryForm.control} name="bonus" render={({ field }) => (<FormItem><FormLabel>Prime (FCFA)</FormLabel><FormControl><Input disabled={isReadOnly} type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={paySalaryForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (facultatif)</FormLabel><FormControl><Input disabled={isReadOnly} {...field} /></FormControl><FormMessage /></FormItem>)} />
              {!isReadOnly && <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenPayDialog(false)}>Annuler</Button><Button type="submit">Confirmer le paiement</Button></DialogFooter>}
              </form></Form></DialogContent></Dialog>
    </MainLayout>
  );
};

export default EmployeesPage;