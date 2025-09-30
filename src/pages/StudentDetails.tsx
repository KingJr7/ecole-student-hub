import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { useDatabase } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Phone, Briefcase, CalendarCheck2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StudentFeeManager from '@/components/StudentFeeManager';

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

interface Parent { id: number; name: string; first_name: string; phone?: string; email?: string; profession?: string; relation?: string; }
interface Attendance { id: number; date: string; state: string; }
interface FeeStatus { id: string; name: string; amount: number; due_date: string; total_paid: number; balance: number; status: 'Payé' | 'En retard' | 'À venir'; type: 'unique' | 'recurrent'; }
interface ClassResult {
  studentId: number;
  studentName: string;
  studentPicture: string | null;
  studentMatricul: string | null;
  average: number;
  rank: number;
  status: string;
  subjects: { 
    [subjectName: string]: { 
      average: number | null; 
      coefficient: number; 
      notes: { type: string; value: number | null; }[];
    } 
  };
}

const BulletinModal = ({ studentId, classId, db }) => {
  const [studentResult, setStudentResult] = useState<ClassResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState('1');

  useEffect(() => {
    const fetchResults = async () => {
      if (!studentId || !classId) return;
      setLoading(true);
      try {
        const results = await db.getClassResults(classId, parseInt(selectedQuarter, 10));
        const currentStudentResult = results.find(r => r.studentId === studentId) || null;
        setStudentResult(currentStudentResult);
      } catch (error) {
        console.error("Failed to fetch student results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [studentId, classId, selectedQuarter, db]);

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Bulletin de notes - Trimestre {selectedQuarter}</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <div className="flex justify-end mb-4">
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par trimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Trimestre 1</SelectItem>
              <SelectItem value="2">Trimestre 2</SelectItem>
              <SelectItem value="3">Trimestre 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-1">
          {loading ? (
            <p>Chargement du bulletin...</p>
          ) : studentResult ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Résultats du trimestre</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-sm text-muted-foreground">Moyenne Générale</p><p className="text-2xl font-bold">{studentResult.average.toFixed(2)}/20</p></div>
                    <div><p className="text-sm text-muted-foreground">Rang</p><p className="text-2xl font-bold">{studentResult.rank}</p></div>
                    <div><p className="text-sm text-muted-foreground">Décision</p><p className={`text-2xl font-bold ${studentResult.status === 'Admis' ? 'text-green-600' : 'text-red-600'}`}>{studentResult.status}</p></div>
                  </div>
                </CardContent>
              </Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matière</TableHead>
                    <TableHead className="text-center">Devoir 1</TableHead>
                    <TableHead className="text-center">Devoir 2</TableHead>
                    <TableHead className="text-center">Compo</TableHead>
                    <TableHead className="text-center font-bold">Moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(studentResult.subjects).map(([subjectName, subjectData]) => (
                    <TableRow key={subjectName}>
                      <TableCell className="font-medium">{subjectName}</TableCell>
                      <TableCell className="text-center">{subjectData.notes.find(n => n.type === 'Devoir 1')?.value ?? '-'}</TableCell>
                      <TableCell className="text-center">{subjectData.notes.find(n => n.type === 'Devoir 2')?.value ?? '-'}</TableCell>
                      <TableCell className="text-center">{subjectData.notes.find(n => n.type === 'Composition')?.value ?? '-'}</TableCell>
                      <TableCell className="text-center font-bold">{subjectData.average?.toFixed(2) ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Aucun résultat trouvé pour ce trimestre.</p>
          )}
        </div>
      </div>
    </DialogContent>
  );
};

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
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBulletinOpen, setIsBulletinOpen] = useState(false);
  const db = useDatabase();

  useEffect(() => {
    const loadStudentData = async () => {
      if (!studentId) return;
      const id = parseInt(studentId, 10);
      if (isNaN(id)) return;

      setLoading(true);
      try {
        const fetchedStudent = await db.getStudentDetails(id);
        setStudent(fetchedStudent || null);

        if (fetchedStudent) {
          const studentParentsArray = [];
          if (fetchedStudent.parentInfo?.father) {
            studentParentsArray.push({ ...fetchedStudent.parentInfo.father, relation: 'père' });
          }
          if (fetchedStudent.parentInfo?.mother) {
            studentParentsArray.push({ ...fetchedStudent.parentInfo.mother, relation: 'mère' });
          }
          setParents(studentParentsArray);

          const [studentAttendances, reg] = await Promise.all([
            db.getAttendancesByStudentId(id),
            db.getLatestRegistrationForStudent({ studentId: id })
          ]);
          
          setAttendances(studentAttendances);
          setRegistration(reg);

          if (reg) {
            const studentLevel = fetchedStudent.classLevel;
            const status = await db.getStudentFeeStatus({ registrationId: reg.id, level: studentLevel });
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
                <Dialog open={isBulletinOpen} onOpenChange={setIsBulletinOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4" disabled={!student.classId}><FileText className="mr-2 h-4 w-4"/>Voir le bulletin</Button>
                  </DialogTrigger>
                  {isBulletinOpen && <BulletinModal studentId={student.id} classId={student.classId} db={db} />}
                </Dialog>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Statut Financier</CardTitle>
            {registration && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Gérer les frais personnalisés</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Gérer les frais personnalisés</DialogTitle>
                  </DialogHeader>
                  <StudentFeeManager 
                    registration={registration} 
                    studentLevel={student.classLevel} 
                    classId={student.classId} 
                  />
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
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