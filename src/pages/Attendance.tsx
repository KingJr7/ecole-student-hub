
import { useState, useEffect } from "react";
import { getAttendanceRecords, getStudents, addAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord } from "@/lib/db";
import { AttendanceRecord, Student } from "@/types";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { CalendarCheck, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Attendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<AttendanceRecord>>({});
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  useEffect(() => {
    setStudents(getStudents());
    setAttendanceRecords(getAttendanceRecords());
  }, []);

  const filteredRecords = attendanceRecords.filter(
    (record) => record.date === selectedDate
  );

  const handleOpenAddDialog = () => {
    setCurrentRecord({ date: selectedDate, status: "present" });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (record: AttendanceRecord) => {
    setCurrentRecord({ ...record });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (recordId: number) => {
    setRecordToDelete(recordId);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveRecord = () => {
    if (!currentRecord.studentId || !currentRecord.date || !currentRecord.status) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (currentRecord.id) {
        // Update existing record
        updateAttendanceRecord(currentRecord.id, currentRecord);
        toast({
          title: "Succès",
          description: "La présence a été mise à jour avec succès.",
        });
      } else {
        // Add new record
        addAttendanceRecord(currentRecord as Omit<AttendanceRecord, "id">);
        toast({
          title: "Succès",
          description: "La présence a été ajoutée avec succès.",
        });
      }

      // Refresh record list
      setAttendanceRecords(getAttendanceRecords());
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecord = () => {
    if (recordToDelete) {
      try {
        deleteAttendanceRecord(recordToDelete);
        setAttendanceRecords(getAttendanceRecords());
        toast({
          title: "Succès",
          description: "L'enregistrement a été supprimé avec succès.",
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression.",
          variant: "destructive",
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setRecordToDelete(null);
  };

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : "Étudiant inconnu";
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "late":
        return "bg-amber-100 text-amber-800";
      case "excused":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "present":
        return "Présent";
      case "absent":
        return "Absent";
      case "late":
        return "En retard";
      case "excused":
        return "Excusé";
      default:
        return status;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center text-school-800">
            <CalendarCheck className="mr-2 h-6 w-6" />
            Gestion des Présences
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="date">Date:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={handleOpenAddDialog} className="bg-school-600 hover:bg-school-700">
              Ajouter une présence
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-medium">Élève</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Date</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Statut</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Notes</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="border-t">
                        <td className="py-3 px-4 text-sm">{getStudentName(record.studentId)}</td>
                        <td className="py-3 px-4 text-sm">{record.date}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-md ${getStatusBadgeClass(record.status)}`}
                          >
                            {getStatusText(record.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{record.notes || "-"}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditDialog(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleOpenDeleteDialog(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Aucune présence enregistrée pour cette date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Attendance Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {currentRecord.id ? "Modifier la présence" : "Ajouter une présence"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="student">Élève</Label>
                <Select
                  value={currentRecord.studentId?.toString() || ""}
                  onValueChange={(value) =>
                    setCurrentRecord({
                      ...currentRecord,
                      studentId: Number(value),
                    })
                  }
                >
                  <SelectTrigger id="student">
                    <SelectValue placeholder="Sélectionnez un élève" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={currentRecord.date || ""}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={currentRecord.status || "present"}
                  onValueChange={(value) =>
                    setCurrentRecord({
                      ...currentRecord,
                      status: value as "present" | "absent" | "late" | "excused",
                    })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Sélectionnez un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Présent</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">En retard</SelectItem>
                    <SelectItem value="excused">Excusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={currentRecord.notes || ""}
                  onChange={(e) =>
                    setCurrentRecord({
                      ...currentRecord,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveRecord}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </DialogHeader>
            <p>Êtes-vous sûr de vouloir supprimer cet enregistrement? Cette action est irréversible.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteRecord}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Attendance;
