
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as api from "@/lib/api";

const Classes = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: classes = [], isLoading, error } = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
  });
  
  const addClassMutation = useMutation({
    mutationFn: api.addClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Classe ajoutée",
        description: `La classe "${className}" a été ajoutée avec succès.`
      });
      setClassName("");
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de l'ajout de la classe.",
        variant: "destructive"
      });
    }
  });
  
  const updateClassMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => 
      api.updateClass(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Classe mise à jour",
        description: `La classe a été mise à jour avec succès.`
      });
      setClassName("");
      setSelectedClass(null);
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la mise à jour de la classe.",
        variant: "destructive"
      });
    }
  });
  
  const deleteClassMutation = useMutation({
    mutationFn: (id: number) => api.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Classe supprimée",
        description: "La classe a été supprimée avec succès."
      });
      setSelectedClass(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la suppression de la classe.",
        variant: "destructive"
      });
    }
  });
  
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (className.trim()) {
      addClassMutation.mutate(className.trim());
    } else {
      toast({
        title: "Erreur",
        description: "Le nom de la classe ne peut pas être vide.",
        variant: "destructive"
      });
    }
  };
  
  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClass && className.trim()) {
      updateClassMutation.mutate({
        id: selectedClass.id,
        name: className.trim()
      });
    } else {
      toast({
        title: "Erreur",
        description: "Le nom de la classe ne peut pas être vide.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteClass = () => {
    if (selectedClass) {
      deleteClassMutation.mutate(selectedClass.id);
    }
  };
  
  const openEditDialog = (classItem: { id: number; name: string }) => {
    setSelectedClass(classItem);
    setClassName(classItem.name);
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (classItem: { id: number; name: string }) => {
    setSelectedClass(classItem);
    setIsDeleteDialogOpen(true);
  };
  
  if (error) {
    return (
      <MainLayout>
        <div className="bg-destructive/20 p-4 rounded-md text-destructive">
          Une erreur s'est produite lors du chargement des classes.
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestion des Classes</h1>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une classe
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nom de la classe</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      Aucune classe trouvée. Ajoutez-en une nouvelle !
                    </TableCell>
                  </TableRow>
                ) : (
                  classes.map((classItem: { id: number; name: string }) => (
                    <TableRow key={classItem.id}>
                      <TableCell>{classItem.id}</TableCell>
                      <TableCell>{classItem.name}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(classItem)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(classItem)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Add Class Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une classe</DialogTitle>
              <DialogDescription>
                Entrez le nom de la nouvelle classe.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddClass}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="className">Nom de la classe</label>
                  <Input
                    id="className"
                    placeholder="Par exemple: Terminale S"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setClassName("");
                    setIsAddDialogOpen(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={addClassMutation.isPending}>
                  {addClassMutation.isPending ? "Ajout en cours..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Class Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier une classe</DialogTitle>
              <DialogDescription>
                Modifiez le nom de la classe.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateClass}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="editClassName">Nom de la classe</label>
                  <Input
                    id="editClassName"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setClassName("");
                    setSelectedClass(null);
                    setIsEditDialogOpen(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={updateClassMutation.isPending}>
                  {updateClassMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Class Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer une classe</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer la classe "{selectedClass?.name}" ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedClass(null);
                  setIsDeleteDialogOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteClass}
                disabled={deleteClassMutation.isPending}
              >
                {deleteClassMutation.isPending ? "Suppression..." : "Supprimer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Classes;
