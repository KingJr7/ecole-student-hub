import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInMinutes, isToday, isThisWeek, isThisMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { PersonStanding, Clock, UserCheck, UserX, Edit, Trash, LogIn, LogOut } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getAccessLevel, PERMISSIONS } from "@/lib/permissions";
import * as api from "@/lib/api";

import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: number;
  name: string;
  type: 'teacher' | 'employee';
  teacherId?: number;
  employeeId?: number;
}

const EmployeeAttendance = () => {
  const { user } = useAuth();
  const accessLevel = getAccessLevel(user?.role, user?.permissions, PERMISSIONS.CAN_MANAGE_EMPLOYEE_ATTENDANCE);
  const isReadOnly = accessLevel !== 'read_write';

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [filterPeriod, setFilterPeriod] = useState('all');

  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery({ queryKey: ["teachers"], queryFn: api.getTeachers });
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({ queryKey: ["employees"], queryFn: api.getEmployees });

  const allStaff = useMemo(() => {
    const combined = [
      ...teachers.map(t => ({ id: t.id, name: `${t.first_name} ${t.name}`, type: 'teacher' as const, teacherId: t.id })),
      ...employees.map(e => ({ id: e.id, name: `${e.first_name} ${e.name}`, type: 'employee' as const, employeeId: e.id }))
    ];
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, employees]);

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["todaysAttendanceSummary"],
    queryFn: () => api.getTodaysAttendanceSummary({ schoolId: user.schoolId }),
  });

  const { data: staffAttendance = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["employeeAttendances", selectedStaff?.id, selectedStaff?.type],
    queryFn: () => api.getEmployeeAttendances({ 
      employeeId: selectedStaff?.type === 'employee' ? selectedStaff.id : undefined,
      teacherId: selectedStaff?.type === 'teacher' ? selectedStaff.id : undefined,
    }),
    enabled: !!selectedStaff,
  });

  const filteredAttendance = useMemo(() => {
    if (!staffAttendance) return [];
    const now = new Date();
    switch (filterPeriod) {
      case 'today':
        return staffAttendance.filter(att => isToday(new Date(att.check_in)));
      case 'week':
        return staffAttendance.filter(att => isThisWeek(new Date(att.check_in), { weekStartsOn: 1 }));
      case 'month':
        return staffAttendance.filter(att => isThisMonth(new Date(att.check_in)));
      case 'all':
      default:
        return staffAttendance;
    }
  }, [staffAttendance, filterPeriod]);

  const clockInMutation = useMutation({
    mutationFn: api.clockInEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todaysAttendanceSummary"] });
      queryClient.invalidateQueries({ queryKey: ["employeeAttendances", selectedStaff?.id, selectedStaff?.type] });
      toast({ title: "Arrivée enregistrée" });
    },
    onError: (error) => toast({ title: "Erreur", description: error.message, variant: "destructive" }),
  });

  const clockOutMutation = useMutation({
    mutationFn: api.clockOutEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todaysAttendanceSummary"] });
      queryClient.invalidateQueries({ queryKey: ["employeeAttendances", selectedStaff?.id, selectedStaff?.type] });
      toast({ title: "Départ enregistré" });
    },
    onError: (error) => toast({ title: "Erreur", description: error.message, variant: "destructive" }),
  });

  const getStaffStatus = (staff: StaffMember) => {
    if (!summary) return { status: 'unknown' };
    const record = summary.find(s => 
      (staff.type === 'teacher' && s.teacher_id === staff.id) || 
      (staff.type === 'employee' && s.employee_id === staff.id)
    );
    if (!record) return { status: 'out' };
    return { status: record.check_out ? 'out' : 'in', recordId: record.id };
  };

  const handleClockIn = () => {
    if (!selectedStaff || isReadOnly) return;
    clockInMutation.mutate({ 
      employeeId: selectedStaff.employeeId,
      teacherId: selectedStaff.teacherId,
      schoolId: user.schoolId 
    });
  };

  const handleClockOut = (attendanceId: number) => {
    if (!selectedStaff || isReadOnly) return;
    clockOutMutation.mutate(attendanceId);
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "En cours";
    const minutes = differenceInMinutes(new Date(end), new Date(start));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const totalHoursToday = useMemo(() => {
    if (!summary) return 0;
    return summary.reduce((acc, record) => {
        if (record.check_out) {
            const minutes = differenceInMinutes(new Date(record.check_out), new Date(record.check_in));
            return acc + (minutes / 60);
        }
        return acc;
    }, 0);
  }, [summary]);

  return (
    <MainLayout title="Cahier de Pointage du Personnel">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Personnel</CardTitle>
              <CardDescription>Liste de tout le personnel</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              {(isLoadingTeachers || isLoadingEmployees) ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-2">
                  {allStaff.map(staff => {
                    const { status } = getStaffStatus(staff);
                    return (
                      <div 
                        key={`${staff.type}-${staff.id}`}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50",
                          selectedStaff?.id === staff.id && selectedStaff?.type === staff.type && "bg-muted"
                        )}
                        onClick={() => setSelectedStaff(staff)}
                      >
                        <div className="flex items-center">
                          <div className={cn("w-2 h-2 rounded-full mr-3", status === 'in' ? 'bg-green-500' : 'bg-red-500')} />
                          <div>
                            <h3 className="font-medium">{staff.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{staff.type === 'teacher' ? 'Professeur' : 'Personnel'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>{selectedStaff ? selectedStaff.name : "Sélectionnez un membre du personnel"}</CardTitle>
                    <CardDescription>{selectedStaff ? `Historique de présence pour ${selectedStaff.name}` : "Cliquez sur un nom pour voir les détails"}</CardDescription>
                </CardHeader>
                {selectedStaff && (
                    <CardContent>
                        <div className="flex gap-2 mb-4">
                            <Button onClick={handleClockIn} disabled={isReadOnly || getStaffStatus(selectedStaff).status === 'in'}>
                                <LogIn className="mr-2 h-4 w-4" /> Pointer l'arrivée
                            </Button>
                            <Button onClick={() => handleClockOut(getStaffStatus(selectedStaff).recordId)} disabled={isReadOnly || getStaffStatus(selectedStaff).status !== 'in'} variant="destructive">
                                <LogOut className="mr-2 h-4 w-4" /> Pointer le départ
                            </Button>
                        </div>

                        <div className="flex gap-2 mb-4 border-b pb-4">
                            <Button variant={filterPeriod === 'today' ? 'secondary' : 'ghost'} onClick={() => setFilterPeriod('today')}>Aujourd'hui</Button>
                            <Button variant={filterPeriod === 'week' ? 'secondary' : 'ghost'} onClick={() => setFilterPeriod('week')}>Cette semaine</Button>
                            <Button variant={filterPeriod === 'month' ? 'secondary' : 'ghost'} onClick={() => setFilterPeriod('month')}>Ce mois-ci</Button>
                            <Button variant={filterPeriod === 'all' ? 'secondary' : 'ghost'} onClick={() => setFilterPeriod('all')}>Tout</Button>
                        </div>

                        {isLoadingAttendance ? (
                            <Skeleton className="h-64 w-full" />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Arrivée</TableHead>
                                        <TableHead>Départ</TableHead>
                                        <TableHead>Durée</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAttendance.map(att => (
                                        <TableRow key={att.id}>
                                            <TableCell>{format(new Date(att.check_in), 'PPP', { locale: fr })}</TableCell>
                                            <TableCell>{format(new Date(att.check_in), 'p', { locale: fr })}</TableCell>
                                            <TableCell>{att.check_out ? format(new Date(att.check_out), 'p', { locale: fr }) : <span className="text-muted-foreground">-</span>}</TableCell>
                                            <TableCell>{formatDuration(att.check_in, att.check_out)}</TableCell>
                                            <TableCell className="text-right">
                                                {!isReadOnly && (
                                                    <Button variant="ghost" size="icon" disabled>
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                         {filteredAttendance.length === 0 && !isLoadingAttendance && <p className="text-center text-muted-foreground py-8">Aucun pointage pour cette période.</p>}
                    </CardContent>
                )}
            </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeAttendance;
