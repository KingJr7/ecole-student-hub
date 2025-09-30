import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDatabase } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FeeTemplateForm } from "./FeeTemplateForm";
import { useToast } from "@/components/ui/use-toast";

export function FeeTemplateManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();
  const { getAllFeeTemplates, createFeeTemplate, updateFeeTemplate, deleteFeeTemplate, getAllClasses } = useDatabase();
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery({ 
    queryKey: ['feeTemplates'], 
    queryFn: getAllFeeTemplates 
  });

  const { data: classes } = useQuery({ 
    queryKey: ['classes'], 
    queryFn: getAllClasses 
  });

  const mutation = useMutation({
    mutationFn: (variables: { id?: number; data: any }) => 
      variables.id
        ? updateFeeTemplate(variables.id, variables.data)
        : createFeeTemplate(variables.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTemplates'] });
      toast({ description: `Modèle traité avec succès.` });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeeTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTemplates'] });
      toast({ description: "Modèle supprimé avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Modèles de Frais Récurrents</CardTitle>
        <Button onClick={() => { setEditingTemplate(null); setIsDialogOpen(true); }}>Ajouter un modèle</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Chargement...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Fréquence</TableHead>
                <TableHead>Applicable à</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell className="capitalize">{template.frequency}</TableCell>
                  <TableCell className="capitalize">{template.applies_to_class_id ? classes?.find(c=>c.id === template.applies_to_class_id)?.name : template.applies_to_level}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingTemplate(template); setIsDialogOpen(true); }}>Modifier</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Supprimer</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(template.id)}>Supprimer</AlertDialogAction>
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
              <DialogTitle>{editingTemplate ? "Modifier le modèle" : "Nouveau modèle de frais"}</DialogTitle>
            </DialogHeader>
            <FeeTemplateForm key={editingTemplate?.id || 'new'} onSubmit={(data) => mutation.mutate({ id: editingTemplate?.id, data: data })} initialData={editingTemplate} classes={classes} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
