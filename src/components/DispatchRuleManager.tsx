import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDatabase } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DispatchRuleForm } from "./DispatchRuleForm";

export function DispatchRuleManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();
  const { getAllDispatchRules, getAllFees, getAllFinancialCategories, deleteDispatchRule } = useDatabase();

  const { data: rules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['dispatchRules'],
    queryFn: getAllDispatchRules,
  });

  const { data: fees } = useQuery({ 
    queryKey: ['fees'], 
    queryFn: () => getAllFees({ level: 'all' }) 
  });

  const { data: categories } = useQuery({ 
    queryKey: ['financialCategories'], 
    queryFn: getAllFinancialCategories 
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDispatchRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchRules'] });
    },
  });

  const feesMap = useMemo(() => fees?.reduce((acc, fee) => {
    acc[fee.id] = fee.name;
    return acc;
  }, {}), [fees]);

  if (isLoadingRules) {
    return <p>Chargement des règles de répartition...</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des Règles de Répartition</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            setEditingRule(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(null)}>Ajouter une règle</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Modifier la Règle' : 'Nouvelle Règle'} de Répartition</DialogTitle>
            </DialogHeader>
            <DispatchRuleForm 
              fees={fees} 
              categories={categories} 
              setDialogOpen={setIsDialogOpen} 
              initialData={editingRule}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Créez et gérez ici les règles de répartition automatique des revenus. 
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom de la règle</TableHead>
              <TableHead>Frais Source</TableHead>
              <TableHead>Détails de la Répartition</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules?.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>{feesMap?.[rule.source_fee_id] || 'N/A'}</TableCell>
                <TableCell>
                  <ul className="list-disc pl-5">
                    {rule.details.map(detail => (
                      <li key={detail.id}>
                        {detail.destination_category.name}: {detail.percentage * 100}%
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingRule(rule);
                    setIsDialogOpen(true);
                  }}>Modifier</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">Supprimer</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. La règle de répartition sera définitivement supprimée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(rule.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rules?.length === 0 && (
          <p className="text-center text-muted-foreground mt-4">Aucune règle de répartition définie.</p>
        )}
      </CardContent>
    </Card>
  );
}
