import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/Layout/MainLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDatabase } from "@/hooks/useDatabase";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const transactionSchema = z.object({
  date: z.date(),
  description: z.string().min(1, "La description est requise"),
  amount: z.coerce.number().min(1, "Le montant doit être supérieur à 0"),
  type: z.enum(["income", "expense"]),
  category_id: z.coerce.number(),
});

const categorySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  type: z.enum(["income", "expense"]),
});

const FinancePage = () => {
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    categoryId: "",
    startDate: null,
    endDate: null,
  });

  const queryClient = useQueryClient();
  const { 
    getFinancialSummary, 
    getAllFinancialTransactions, 
    getAllFinancialCategories, 
    createFinancialTransaction,
    createFinancialCategory
  } = useDatabase();

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['financialSummary'],
    queryFn: getFinancialSummary,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['financialTransactions', filters],
    queryFn: () => getAllFinancialTransactions(filters),
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['financialCategories'],
    queryFn: getAllFinancialCategories,
  });

  const transactionForm = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      description: "",
      amount: 0,
      type: "expense",
    },
  });

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
    },
  });

  const transactionMutation = useMutation({ 
    mutationFn: createFinancialTransaction, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financialTransactions', filters] });
      setIsTransactionDialogOpen(false);
      transactionForm.reset();
    }
  });

  const categoryMutation = useMutation({
    mutationFn: createFinancialCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialCategories'] });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
    }
  });

  const onTransactionSubmit = (values: z.infer<typeof transactionSchema>) => {
    transactionMutation.mutate(values);
  };

  const onCategorySubmit = (values: z.infer<typeof categorySchema>) => {
    categoryMutation.mutate(values);
  };

  const handleFilterChange = (filterName, value) => {
    const actualValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [filterName]: actualValue }));
  };

  const resetFilters = () => {
    setFilters({
      type: '',
      categoryId: '',
      startDate: null,
      endDate: null,
    });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <MainLayout>
      <div className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Revenu Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalIncome.toLocaleString('fr-FR')} FCFA</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dépenses Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalExpenses.toLocaleString('fr-FR')} FCFA</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bénéfice Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.netProfit.toLocaleString('fr-FR')} FCFA</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Répartition des revenus par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={summary?.incomeByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                    {summary?.incomeByCategory?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Répartition des dépenses par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={summary?.expenseByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                    {summary?.expenseByCategory?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Filtres</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Select value={filters.type || 'all'} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type (Tout)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout type</SelectItem>
                  <SelectItem value="income">Revenu</SelectItem>
                  <SelectItem value="expense">Dépense</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.categoryId || 'all'} onValueChange={(value) => handleFilterChange('categoryId', value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Catégorie (Toutes)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, "PPP") : <span>Date de début</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleFilterChange('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, "PPP") : <span>Date de fin</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleFilterChange('endDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button onClick={resetFilters} variant="ghost">Réinitialiser</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transactions</CardTitle>
              <div className="flex gap-2">
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Ajouter une catégorie</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvelle Catégorie</DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom de la catégorie</FormLabel>
                              <FormControl>
                                <Input placeholder="Salaires" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez un type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="income">Revenu</SelectItem>
                                  <SelectItem value="expense">Dépense</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit">Enregistrer la catégorie</Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Ajouter une transaction</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvelle Transaction</DialogTitle>
                    </DialogHeader>
                    <Form {...transactionForm}>
                      <form onSubmit={transactionForm.handleSubmit(onTransactionSubmit)} className="space-y-4">
                        <FormField
                          control={transactionForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-[240px] pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Choisissez une date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={transactionForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Facture d'électricité" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={transactionForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Montant</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={transactionForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez un type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="income">Revenu</SelectItem>
                                  <SelectItem value="expense">Dépense</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={transactionForm.control}
                          name="category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Catégorie</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez une catégorie" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.filter(c => c.type === transactionForm.watch('type')).map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit">Enregistrer</Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <p>Chargement des transactions...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{new Date(transaction.date).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.category.name}</TableCell>
                        <TableCell>{transaction.type === 'income' ? 'Revenu' : 'Dépense'}</TableCell>
                        <TableCell className={cn(transaction.type === 'income' ? 'text-green-500' : 'text-red-500')}>{transaction.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default FinancePage;
