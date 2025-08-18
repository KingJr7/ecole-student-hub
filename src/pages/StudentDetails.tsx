
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { useDatabase } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { User, Phone, Briefcase, CalendarCheck2 } from "lucide-react";

// Interfaces
interface Student {
  id: number;
  name: string;
  first_name: string;
  genre?: string;
  birth_date?: string;
  className?: string;
  classId?: number;
}

interface Parent {
  id: number;
  name: string;
  first_name: string;
  phone?: string;
  email?: string;
  profession?: string;
  relation?: string; // Ajouté par la logique de récupération
}

interface Attendance {
  id: number;
  date: string;
  state: string;
}

interface FeeStatus {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  total_paid: number;
  balance: number;
  status: 'Payé' | 'En retard' | 'À venir';
}

const StudentDetailsSkeleton = () => (
  <MainLayout>
    <div className="space-y-6 animate-pulse">
      <div>
        <Skeleton className="h-9 w-1/2 rounded-md" />
        <Skeleton className="h-5 w-1/3 mt-2 rounded-md" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
            <CardHeader><CardTitle><Skeleton className="h-7 w-40 rounded-md" /></CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle><Skeleton className="h-7 w-48 rounded-md" /></CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-6 w-full rounded-md" />
                <Skeleton className="h-6 w-full rounded-md" />
                <Skeleton className="h-6 w-full rounded-md" />
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-7 w-48 rounded-md" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]"><Skeleton className="h-5 w-full" /></TableHead>
                <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                <TableHead className="w-[100px]"><Skeleton className="h-5 w-full" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </MainLayout>
);

const StudentDetails = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [parents, setParents] = useState<Parent[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [feeStatus, setFeeStatus] = useState<FeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useDatabase();

  useEffect(() => {
    const loadStudentData = async () => {
      if (!studentId) return;
      const id = parseInt(studentId, 10);
      if (isNaN(id)) return;

      setLoading(true);
      try {
        const students = await db.getAllStudents();
        const currentStudent = students.find(s => s.id === id);
        setStudent(currentStudent || null);

        if (currentStudent) {
          const [studentParents, studentAttendances, registration] = await Promise.all([
            db.getStudentParents(id),
            db.getAttendancesByStudentId(id),
            db.getLatestRegistrationForStudent({ studentId: id })
          ]);
          
          setParents(studentParents);
          setAttendances(studentAttendances);

          if (registration) {
            const studentLevel = currentStudent.className?.toLowerCase().includes('primaire') ? 'primaire' : currentStudent.className?.toLowerCase().includes('college') ? 'college' : 'lycee';
            const status = await db.getStudentFeeStatus({ registrationId: registration.id, level: studentLevel });
            setFeeStatus(status);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données de l'étudiant:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [studentId, db]);

  const getStatusClass = (status: FeeStatus['status']) => {
    switch (status) {
      case 'Payé':
        return 'font-semibold text-green-600';
      case 'En retard':
        return 'font-semibold text-red-600';
      case 'À venir':
        return 'font-semibold text-gray-500';
      default:
        return 'font-semibold';
    }
  };

  const getAttendanceStateClass = (state: string) => {
    switch (state) {
      case 'present': return 'text-green-600';
      case 'absent': return 'text-red-600';
      case 'late': return 'text-yellow-600';
      default: return '';
    }
  };

  const translateAttendanceState = (state: string) => {
      switch (state) {
          case 'present': return 'Présent';
          case 'absent': return 'Absent';
          case 'late': return 'En retard';
          default: return state;
      }
  }

  if (loading) {
    return <StudentDetailsSkeleton />;
  }

  if (!student) {
    return <MainLayout><div className="text-center py-10">Étudiant non trouvé.</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{student.first_name} {student.name}</h1>
          <p className="text-muted-foreground">{student.className} | {student.genre} | {new Date(student.birth_date).toLocaleDateString()}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><User className="h-5 w-5 mr-2"/> Informations des Parents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {parents.length > 0 ? parents.map(parent => (
                        <div key={parent.id} className="p-3 bg-gray-50 rounded-lg border">
                            <p className="font-bold text-school-800">{parent.first_name} {parent.name} <span className="text-sm font-normal text-muted-foreground">({parent.relation})</span></p>
                            <div className="text-sm text-gray-600 mt-2 space-y-1">
                                <p className="flex items-center"><Phone className="h-4 w-4 mr-2" /> {parent.phone || 'Non renseigné'}</p>
                                <p className="flex items-center"><Briefcase className="h-4 w-4 mr-2" /> {parent.profession || 'Non renseigné'}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground">Aucun parent lié.</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><CalendarCheck2 className="h-5 w-5 mr-2"/> Présences Récentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {attendances.length > 0 ? attendances.map(att => (
                            <li key={att.id} className="flex justify-between items-center p-2 rounded-md bg-gray-50 border">
                                <span className="font-medium">{new Date(att.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <span className={`font-semibold ${getAttendanceStateClass(att.state)}`}>{translateAttendanceState(att.state)}</span>
                            </li>
                        )) : (
                            <p className="text-sm text-muted-foreground">Aucun historique de présence.</p>
                        )}
                    </ul>
                </CardContent>
            </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Statut Financier</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frais</TableHead>
                  <TableHead>Montant Total</TableHead>
                  <TableHead>Montant Payé</TableHead>
                  <TableHead>Solde Restant</TableHead>
                  <TableHead>Date d'échéance</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStatus.length > 0 ? feeStatus.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.name}</TableCell>
                    <TableCell>{(fee.amount || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell>{(fee.total_paid || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell className="font-bold">{(fee.balance || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell>{fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <span className={getStatusClass(fee.status)}>
                        {fee.status}
                      </span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Aucun frais applicable trouvé.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
};

export default StudentDetails;
