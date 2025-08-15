import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Edit, Trash, Save, Users, DollarSign, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, paySalary, getSettings } from "@/lib/api";
import { Employee } from "@/types";

// Schéma du formulaire d'ajout/édition d'employé
const employeeFormSchema = z.object({
  first_name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  adress: z.string().optional(),
  job_title: z.string().min(2, "Le poste est requis"),
  salary: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, "Le salaire doit être positif")
  ),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

const EmployeesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);

  // Récupération des données
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  // Mutations
  const addEmployeeMutation = useMutation({
    mutationFn: addEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Employé ajouté" });
      setOpenEmployeeDialog(false);
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Employé mis à jour" });
      setOpenEmployeeDialog(false);
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Employé supprimé" });
      setSelectedEmployee(null);
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const paySalaryMutation = useMutation({
    mutationFn: paySalary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Salaire payé" });
      setOpenPayDialog(false);
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
  });

  const onEmployeeFormSubmit: SubmitHandler<EmployeeFormValues> = (data) => {
    const employeeData = { ...data, gender: 'Non spécifié' };
    if (selectedEmployee) {
      updateEmployeeMutation.mutate({ id: selectedEmployee.id, data: employeeData });
    } else {
      addEmployeeMutation.mutate(employeeData);
    }
  };

  const paySalaryForm = useForm({
    defaultValues: {
      bonus: 0,
      notes: "",
    },
  });

  const handlePaySalary = async (data) => {
    if (selectedEmployee) {
      const paymentDate = new Date().toISOString().split('T')[0];
      const settings = await getSettings();

      paySalaryMutation.mutate({
        employee_id: selectedEmployee.id,
        base_salary: selectedEmployee.salary,
        bonus_amount: parseFloat(data.bonus) || 0,
        payment_date: paymentDate,
        notes: data.notes,
      }, {
        onSuccess: () => {
          generatePayslip(
            selectedEmployee, 
            paymentDate, 
            parseFloat(data.bonus) || 0, 
            data.notes,
            settings?.schoolName || 'Ntik School',
            settings?.schoolAddress || 'Adresse non configurée'
          );
        }
      });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    employeeForm.reset(employee);
    setOpenEmployeeDialog(true);
  };

  const handleDeleteEmployee = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const handleNewEmployee = () => {
    setSelectedEmployee(null);
    employeeForm.reset({ first_name: "", name: "", email: "", phone: "", adress: "", job_title: "", salary: 0 });
    setOpenEmployeeDialog(true);
  };

  const generatePayslip = (employee: Employee, paymentDate: string, bonus: number, notes: string, schoolName: string, schoolAddress: string) => {
    const printWindow = window.open('', '', 'height=800,width=600');

    const payslipHTML = `
      <html>
        <head>
          <title>Fiche de Paie - ${employee.first_name} ${employee.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9; color: #333; }
            .payslip-container { background-color: white; max-width: 800px; margin: auto; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4a4a4a; padding-bottom: 20px; margin-bottom: 20px; }
            .school-info h2 { margin: 0; font-size: 24px; } .school-info p { margin: 5px 0 0; color: #666; }
            .payslip-title { text-align: right; }
            .payslip-title h1 { margin: 0; font-size: 28px; color: #4a4a4a; }
            .payslip-title p { margin: 5px 0 0; color: #666; }
            .employee-details { background-color: #f2f2f2; padding: 15px; border-radius: 6px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .employee-details p { margin: 5px 0; font-size: 14px; } .employee-details strong { color: #4a4a4a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; }
            thead th { background-color: #f2f2f2; font-weight: 600; font-size: 14px; }
            .line-item td { font-size: 15px; }
            .totals-section { margin-top: 20px; }
            .net-pay { background-color: #4a4a4a; color: white; font-size: 18px; font-weight: bold; }
            .net-pay td { padding: 15px; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="header">
              <div class="school-info">
                <h2>${schoolName}</h2>
                <p>${schoolAddress}</p>
              </div>
              <div class="payslip-title">
                <h1>Fiche de Paie</h1>
                <p><strong>Date:</strong> ${new Date(paymentDate).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            <div class="employee-details">
              <div><p><strong>Employé:</strong></p><p>${employee.first_name} ${employee.name}</p></div>
              <div><p><strong>Matricule:</strong></p><p>${employee.matricule}</p></div>
              <div><p><strong>Poste:</strong></p><p>${employee.job_title}</p></div>
              <div><p><strong>Période de paie:</strong></p><p>${new Date(paymentDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr class="line-item">
                  <td>Salaire de base</td>
                  <td style="text-align: right;">${employee.salary.toLocaleString('fr-FR')} FCFA</td>
                </tr>
                <tr class="line-item">
                  <td>Prime</td>
                  <td style="text-align: right;">${bonus.toLocaleString('fr-FR')} FCFA</td>
                </tr>
                <tr class="line-item">
                  <td><i>${notes || ''}</i></td>
                  <td></td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="net-pay">
                  <td>Net à Payer</td>
                  <td style="text-align: right;">${(employee.salary + bonus).toLocaleString('fr-FR')} FCFA</td>
                </tr>
              </tfoot>
            </table>

            <div class="footer">
              <p>Ceci est une fiche de paie générée automatiquement.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(payslipHTML);
    printWindow.document.close();
    printWindow.focus();
    // Laisser un petit délai pour que le contenu se charge avant d'imprimer
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <MainLayout title="Gestion du Personnel">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Personnel</span>
              <Button onClick={handleNewEmployee} size="sm" variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau
              </Button>
            </CardTitle>
            <CardDescription>Liste du personnel de l'établissement</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? <p>Chargement...</p> : (
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className={`flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50 ${selectedEmployee?.id === employee.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <div>
                      <h3 className="font-medium">{employee.first_name} {employee.name}</h3>
                      <p className="text-sm text-muted-foreground">{employee.job_title}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditEmployee(employee); }}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(employee.id); }}><Trash className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.name}` : "Sélectionnez un employé"}
            </CardTitle>
            {selectedEmployee && (
              <div className="text-sm text-muted-foreground mt-1">
                <p>{selectedEmployee.email} | {selectedEmployee.phone}</p>
                <p>Matricule: {selectedEmployee.matricule}</p>
              </div>
            )}
          </CardHeader>
          {selectedEmployee ? (
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold flex items-center"><Briefcase className="mr-2 h-5 w-5"/>Poste</h4>
                  <p className="text-lg">{selectedEmployee.job_title}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold flex items-center"><DollarSign className="mr-2 h-5 w-5"/>Salaire Mensuel</h4>
                  <p className="text-lg">{selectedEmployee.salary?.toLocaleString() || "0"} FCFA</p>
                </div>
                <div className="pt-4">
                  <Button onClick={() => setOpenPayDialog(true)}>Payer le salaire</Button>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Sélectionnez un employé pour voir ses détails</p>
            </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={openEmployeeDialog} onOpenChange={setOpenEmployeeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? "Modifier" : "Ajouter"} un employé</DialogTitle>
          </DialogHeader>
          <Form {...employeeForm}>
            <form onSubmit={employeeForm.handleSubmit(onEmployeeFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={employeeForm.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={employeeForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={employeeForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={employeeForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={employeeForm.control} name="adress" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={employeeForm.control} name="job_title" render={({ field }) => (<FormItem><FormLabel>Poste</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={employeeForm.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salaire</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenEmployeeDialog(false)}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={openPayDialog} onOpenChange={setOpenPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payer le salaire de {selectedEmployee?.first_name} {selectedEmployee?.name}</DialogTitle>
            <DialogDescription>
              Salaire de base: {selectedEmployee?.salary?.toLocaleString()} FCFA
            </DialogDescription>
          </DialogHeader>
          <Form {...paySalaryForm}>
            <form onSubmit={paySalaryForm.handleSubmit(handlePaySalary)} className="space-y-4">
              <FormField
                control={paySalaryForm.control}
                name="bonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prime (FCFA)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paySalaryForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (facultatif)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenPayDialog(false)}>Annuler</Button>
                <Button type="submit">Confirmer le paiement</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default EmployeesPage;
