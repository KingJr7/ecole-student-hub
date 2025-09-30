import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDatabase } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FeeForm } from "./FeeForm";
import { useToast } from "@/components/ui/use-toast";

export function FeeManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const queryClient = useQueryClient();
  const { getAllFees, createFee, updateFee, deleteFee, getAllClasses } = useDatabase();
  const { toast } = useToast();

  const { data: fees, isLoading } = useQuery({ 
    queryKey: ['fees'], 
    queryFn: getAllFees 
  });

  const { data: classes } = useQuery({ 
    queryKey: ['classes'], 
    queryFn: getAllClasses 
  });

  const mutation = useMutation({
    mutationFn: (variables: { id?: number; data: any }) => 
      variables.id
        ? updateFee(variables.id, variables.data)
        : createFee(variables.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast({ description: `Frais traités avec succès.` });
      setIsDialogOpen(false);
      setEditingFee(null);
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast({ description: "Frais supprimés avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const handleSave = (data) => {
    const submissionData = {
      ...data,
      due_date: data.due_date ? data.due_date.toISOString().split('T')[0] : null,
    };
    mutation.mutate({ id: editingFee?.id, data: submissionData });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des Frais Scolaires</CardTitle>
        <Button onClick={() => { setEditingFee(null); setIsDialogOpen(true); }}>Ajouter des frais</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Chargement...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du frais</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Niveau Concerné</TableHead>
                <TableHead>Date d'échéance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees?.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{fee.name}</TableCell>
                  <TableCell>{fee.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell className="capitalize">{fee.level === 'all' ? 'Général' : fee.level}</TableCell>
                  <TableCell>{fee.due_date ? new Date(fee.due_date).toLocaleDateString('fr-FR') : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingFee(fee); setIsDialogOpen(true); }}>Modifier</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Supprimer</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(fee.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFee ? "Modifier les frais" : "Ajouter des frais"}</DialogTitle>
            </DialogHeader>
            <FeeForm key={editingFee?.id || 'new'} onSubmit={handleSave} initialData={editingFee} classes={classes} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
