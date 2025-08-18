import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats, Student } from "@/types";
import { getDashboardStats, getStudents } from "@/lib/api";
import MainLayout from "@/components/Layout/MainLayout";
import { Users, Book, CalendarCheck, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      try {
        return await getDashboardStats();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les statistiques du tableau de bord"
        });
        return {} as DashboardStats;
      }
    }
  });

  const { data: recentStudents = [] } = useQuery<Student[]>({
    queryKey: ['recentStudents'],
    queryFn: async () => {
      try {
        const students = await getStudents({ limit: 5 });
        return students;
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les étudiants récents"
        });
        return [] as Student[];
      }
    }
  });

  const attendanceData = [
    { name: 'Présents', value: stats?.attendanceToday?.present || 0 },
    { name: 'Absents', value: stats?.attendanceToday?.absent || 0 },
    { name: 'Retards', value: stats?.attendanceToday?.late || 0 },
  ];

  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

  if (isLoading) {
    return <MainLayout><div>Chargement...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-extrabold tracking-tight">Tableau de bord</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Élèves inscrits</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Professeurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalClasses || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Garçons / Filles</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.genderDistribution?.find(g => g.gender === 'Masculin')?.count || 0} / {stats?.genderDistribution?.find(g => g.gender === 'Féminin')?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Paiements des 6 derniers mois</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              {stats?.monthlyPayments && stats.monthlyPayments.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={stats.monthlyPayments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#10B981" name="Total (FCFA)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  Aucune donnée de paiement disponible.
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Présences aujourd'hui</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.attendanceToday && (attendanceData.reduce((acc, item) => acc + item.value, 0) > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={attendanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                      {attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  Aucune donnée de présence enregistrée pour aujourd'hui.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Répartition des élèves par classe</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.studentsPerClass && stats.studentsPerClass.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={stats.studentsPerClass}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="students" fill="#3B82F6" name="Nombre d'élèves" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  Aucune donnée sur les classes disponible.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Élèves récemment inscrits</CardTitle>
            </CardHeader>
            <CardContent>
              {recentStudents.length > 0 ? (
                <div className="space-y-2">
                  {recentStudents.map((student) => (
                    <div key={student.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <div className="font-medium">{student.first_name} {student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.className || 'Aucune classe'}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(student.registration_date).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Aucun élève récemment inscrit
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
