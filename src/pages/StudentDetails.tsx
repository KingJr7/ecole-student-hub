import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { useDatabase } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Phone, Briefcase, CalendarCheck2 } from "lucide-react";

// Interfaces
interface Student {
  id: number;
  name: string;
  first_name: string;
  picture_url?: string | null;
  genre?: string;
  birth_date?: string;
  className?: string;
  classId?: number;
  classLevel?: string;
}

interface Parent {
  id: number;
  name: string;
  first_name: string;
  phone?: string;
  email?: string;
  profession?: string;
  relation?: string;
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
    <div className="space-y-8 p-4 pt-6 md:p-8 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2">
            <Skeleton className="h-9 w-64 rounded-md" />
            <Skeleton className="h-5 w-48 rounded-md" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card><CardHeader><Skeleton className="h-7 w-40"/></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-7 w-48"/></CardHeader><CardContent className="space-y-4"><Skeleton className="h-6 w-full"/><Skeleton className="h-6 w-full"/><Skeleton className="h-6 w-full"/></CardContent></Card>
      </div>
      <Card><CardHeader><Skeleton className="h-7 w-48"/></CardHeader><CardContent><Skeleton className="h-40 w-full"/></CardContent></Card>
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
        const fetchedStudent = await window.api.invoke('db:students:getDetails', id);
        setStudent(fetchedStudent || null);

        if (fetchedStudent) {
          // Extract parents from the fetched student object
          const studentParentsArray = [];
          if (fetchedStudent.parentInfo?.father) {
            studentParentsArray.push({ ...fetchedStudent.parentInfo.father, relation: 'père' });
          }
          if (fetchedStudent.parentInfo?.mother) {
            studentParentsArray.push({ ...fetchedStudent.parentInfo.mother, relation: 'mère' });
          }
          setParents(studentParentsArray);

          const [studentAttendances, registration] = await Promise.all([
            db.getAttendancesByStudentId(id),
            db.getLatestRegistrationForStudent({ studentId: id })
          ]);
          
          setAttendances(studentAttendances);

          if (registration) {
            const studentLevel = fetchedStudent.classLevel;
            const status = await db.getStudentFeeStatus({ registrationId: registration.id, level: studentLevel });
            setFeeStatus(status);
          }
        }
      } catch (error) {
        console.error("Erreur chargement données étudiant:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [studentId, db]);

  const getStatusClass = (status: FeeStatus['status']) => {
    switch (status) {
      case 'Payé': return 'font-semibold text-green-600';
      case 'En retard': return 'font-semibold text-red-600';
      default: return 'font-semibold text-gray-500';
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

  console.log("[DEBUG] Affichage de la page de détails pour l'étudiant:", student);
  console.log("[DEBUG] URL de l'image reçue par le composant:", student.picture_url);

  return (
    <MainLayout>
      <div className="space-y-8 p-4 pt-6 md:p-8">
        <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-1">
                {student.picture_url ? (
                    <img 
                        src={student.picture_url.startsWith('http') ? student.picture_url : `ntik-fs://${student.picture_url}`}
                        alt={`${student.first_name} ${student.name}`} 
                        className="w-full rounded-lg shadow-lg object-cover aspect-square"
                    />
                ) : (
                    <div className="w-full rounded-lg shadow-lg bg-secondary flex items-center justify-center aspect-square">
                        <User className="h-32 w-32 text-muted-foreground" />
                    </div>
                )}
            </div>
            <div className="md:col-span-2">
                <h1 className="text-4xl font-extrabold tracking-tight">{student.first_name} {student.name}</h1>
                <p className="text-muted-foreground text-lg mt-2">{student.className} | {student.genre} | {new Date(student.birth_date).toLocaleDateString()}</p>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle className="flex items-center"><User className="h-5 w-5 mr-2"/> Informations des Parents</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {parents.length > 0 ? parents.map(parent => (
                        <div key={parent.id} className="p-3 bg-secondary rounded-lg border">
                            <p className="font-bold text-foreground">{parent.first_name} {parent.name} <span className="text-sm font-normal text-muted-foreground">({parent.relation})</span></p>
                            <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                <p className="flex items-center"><Phone className="h-4 w-4 mr-2" /> {parent.phone || 'N/A'}</p>
                                <p className="flex items-center"><Briefcase className="h-4 w-4 mr-2" /> {parent.profession || 'N/A'}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground">Aucun parent lié.</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center"><CalendarCheck2 className="h-5 w-5 mr-2"/> Présences Récentes (5 dernières)</CardTitle></CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {attendances.length > 0 ? attendances.map(att => (
                            <li key={att.id} className="flex justify-between items-center p-3 rounded-lg bg-secondary border">
                                <span className="font-medium">{new Date(att.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <span className={`font-semibold`}>{translateAttendanceState(att.state)}</span>
                            </li>
                        )) : (
                            <p className="text-sm text-muted-foreground">Aucun historique de présence.</p>
                        )}
                    </ul>
                </CardContent>
            </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Statut Financier</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Frais</TableHead><TableHead>Montant Total</TableHead><TableHead>Montant Payé</TableHead><TableHead>Solde Restant</TableHead><TableHead>Date d'échéance</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {feeStatus.length > 0 ? feeStatus.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.name}</TableCell>
                    <TableCell>{(fee.amount || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell>{(fee.total_paid || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell className="font-bold">{(fee.balance || 0).toLocaleString()} FCFA</TableCell>
                    <TableCell>{fee.due_date ? new Date(fee.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : 'N/A'}</TableCell>
                    <TableCell><span className={getStatusClass(fee.status)}>{fee.status}</span></TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Aucun frais applicable trouvé.</TableCell></TableRow>
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