
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/types";
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
    recentGrades: 0,
  }, isError: statsError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats
  });

  const { data: studentsData = [], isError: studentsError } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents
  });

  const recentStudents = studentsData.slice(0, 5);

  useEffect(() => {
    if (statsError || studentsError) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du tableau de bord.",
        variant: "destructive",
      });
    }
  }, [statsError, studentsError, toast]);

  const cards = [
    {
      title: "Total Élèves",
      value: stats.totalStudents,
      icon: Users,
      color: "bg-blue-100 text-blue-800",
    },
    {
      title: "Présences Aujourd'hui",
      value: stats.attendanceToday.present,
      icon: CalendarCheck,
      color: "bg-green-100 text-green-800",
    },
    {
      title: "Paiements ce Mois",
      value: `${stats.paymentsThisMonth}€`,
      icon: FileMinus,
      color: "bg-purple-100 text-purple-800",
    },
    {
      title: "Notes Récentes",
      value: stats.recentGrades,
      icon: FileText,
      color: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-school-800">Tableau de Bord</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Élèves récemment inscrits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentStudents.map((student) => (
                  <div key={student.id} className="flex items-center p-2 border-b">
                    <Users className="h-4 w-4 mr-2 text-school-600" />
                    <div>
                      <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-muted-foreground">Inscrit le: {student.enrollmentDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiques d'Assiduité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">Présent</div>
                  <div className="text-2xl font-bold text-green-600">{stats.attendanceToday.present}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Absent</div>
                  <div className="text-2xl font-bold text-red-600">{stats.attendanceToday.absent}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">En retard</div>
                  <div className="text-2xl font-bold text-amber-600">{stats.attendanceToday.late}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Book className="mr-2 h-5 w-5 text-school-600" />
              EcoleHub - Gestion des élèves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Bienvenue dans votre système de gestion scolaire. Utilisez la barre latérale pour naviguer entre les différentes sections.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
