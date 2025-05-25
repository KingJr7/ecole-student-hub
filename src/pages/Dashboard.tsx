import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats, Student } from "@/types";
import { getDashboardStats, getStudents } from "@/lib/api";
import MainLayout from "@/components/Layout/MainLayout";
import { Book, CalendarCheck, FileText, FileMinus, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const { toast } = useToast();

  const { data: stats = {
    totalStudents: 0,
    attendanceToday: {
      present: 0,
      absent: 0,
      late: 0,
    },
    paymentsThisMonth: 0,
    recentGrades: 0
  } } = useQuery({
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

  const { data: recentStudents = [] } = useQuery({
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

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Élèves inscrits
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                Élèves actifs
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Présences aujourd'hui
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.attendanceToday?.present || 0}/{(stats.attendanceToday?.present || 0) + 
                  (stats.attendanceToday?.absent || 0) + 
                  (stats.attendanceToday?.late || 0)}
              </div>
              <div className="flex gap-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  {stats.attendanceToday?.present || 0} présents
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                  {stats.attendanceToday?.absent || 0} absents
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                  {stats.attendanceToday?.late || 0} retards
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Paiements du mois
              </CardTitle>
              <FileMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('fr-FR', { 
                  style: 'currency', 
                  currency: 'XAF',
                  maximumFractionDigits: 0
                }).format(stats.paymentsThisMonth || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Mois en cours
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Notes récentes
              </CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentGrades || 0}</div>
              <p className="text-xs text-muted-foreground">
                Ces 30 derniers jours
              </p>
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
                        <div className="font-medium">{student.firstName} {student.lastName}</div>
                        <div className="text-sm text-muted-foreground">{student.className || 'Aucune classe'}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString('fr-FR')}
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
