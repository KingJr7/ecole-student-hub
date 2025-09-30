import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Form component for adding/editing student fees
const StudentFeeForm = ({ registrationId, studentLevel, classId, studentFee, onSave }) => {
  const [feeId, setFeeId] = useState(studentFee ? (studentFee.fee_template_id ? `template-${studentFee.fee_template_id}` : `single-${studentFee.single_fee_id}`) : '');
  const [customAmount, setCustomAmount] = useState(studentFee?.custom_amount || '');
  const [reason, setReason] = useState(studentFee?.reason || '');
  const [availableFees, setAvailableFees] = useState([]);
  const db = useDatabase();
  const { toast } = useToast();

  useEffect(() => {
    const fetchFees = async () => {
      const [templates, singleFees] = await Promise.all([
        db.getAllFeeTemplates(),
        db.getAllFees()
      ]);
      
      const applicableTemplates = templates.filter(t => t.applies_to_level === studentLevel || t.applies_to_class_id === classId);
      const applicableSingleFees = singleFees.filter(f => f.level === studentLevel || f.class_id === classId);

      const allFees = [
        ...applicableTemplates.map(t => ({ value: `template-${t.id}`, label: `${t.name} (Récurrent)` })),
        ...applicableSingleFees.map(f => ({ value: `single-${f.id}`, label: `${f.name} (Unique)` }))
      ];
      setAvailableFees(allFees);
    };
    fetchFees();
  }, [db, studentLevel, classId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const [type, id] = feeId.split('-');
    const data = {
      registration_id: registrationId,
      fee_template_id: type === 'template' ? parseInt(id) : null,
      single_fee_id: type === 'single' ? parseInt(id) : null,
      custom_amount: parseFloat(customAmount),
      reason: reason,
    };

    try {
      if (studentFee) {
        const updateData = {
          custom_amount: parseFloat(customAmount),
          reason: reason,
        };
        await db.updateStudentFee(studentFee.id, updateData);
        toast({ title: 'Succès', description: 'Tarif spécial mis à jour.' });
      } else {
        const createData = {
          registration_id: registrationId,
          fee_template_id: type === 'template' ? parseInt(id) : null,
          single_fee_id: type === 'single' ? parseInt(id) : null,
          custom_amount: parseFloat(customAmount),
          reason: reason,
        };
        await db.createStudentFee(createData);
        toast({ title: 'Succès', description: 'Nouveau tarif spécial ajouté.' });
      }
      onSave();
    } catch (error) {
      console.error('Failed to save student fee', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le tarif spécial.', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fee">Frais concerné</Label>
        <Select value={feeId} onValueChange={setFeeId} required disabled={!!studentFee}>
          <SelectTrigger id="fee"><SelectValue placeholder="Sélectionner un frais" /></SelectTrigger>
          <SelectContent>
            {availableFees.map(fee => (
              <SelectItem key={fee.value} value={fee.value}>{fee.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="customAmount">Montant Personnalisé</Label>
        <Input id="customAmount" type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="reason">Raison</Label>
        <Input id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Famille nombreuse" />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
};

// Main manager component
const StudentFeeManager = ({ registration, studentLevel, classId }) => {
  const [studentFees, setStudentFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const db = useDatabase();
  const { toast } = useToast();

  const fetchStudentFees = useCallback(async () => {
    if (!registration?.id) return;
    try {
      setLoading(true);
      const fees = await db.getStudentFeesByRegistration(registration.id);
      setStudentFees(fees);
    } catch (error) {
      console.error("Failed to fetch student fees:", error);
    } finally {
      setLoading(false);
    }
  }, [db, registration?.id]);

  useEffect(() => {
    fetchStudentFees();
  }, [fetchStudentFees]);

  const handleSave = () => {
    setIsFormOpen(false);
    setEditingFee(null);
    fetchStudentFees();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce tarif spécial ?')) {
      try {
        await db.deleteStudentFee(id);
        toast({ title: 'Succès', description: 'Tarif spécial supprimé.' });
        fetchStudentFees();
      } catch (error) {
        console.error('Failed to delete student fee', error);
        toast({ title: 'Erreur', description: 'Impossible de supprimer le tarif spécial.', variant: 'destructive' });
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Frais Personnalisés</CardTitle>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => setEditingFee(null)}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFee ? 'Modifier le' : 'Ajouter un'} tarif spécial</DialogTitle>
            </DialogHeader>
            <StudentFeeForm 
              key={editingFee?.id || 'new'}
              registrationId={registration?.id} 
              studentLevel={studentLevel}
              classId={classId}
              studentFee={editingFee}
              onSave={handleSave} 
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Frais</TableHead>
                <TableHead>Montant Personnalisé</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentFees.length > 0 ? studentFees.map(fee => (
                <TableRow key={fee.id}>
                  <TableCell>{fee.fee_template?.name || fee.single_fee?.name}</TableCell>
                  <TableCell>{fee.custom_amount.toLocaleString()} FCFA</TableCell>
                  <TableCell>{fee.reason || '-'}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingFee(fee); setIsFormOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center">Aucun tarif spécial configuré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentFeeManager;
