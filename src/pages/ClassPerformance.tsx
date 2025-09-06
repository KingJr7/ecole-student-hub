import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDatabase } from "@/hooks/useDatabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MainLayout from "@/components/Layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StudentResultsTable from "@/components/StudentResultsTable";

const ClassPerformance = () => {
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const { getAllClassesPerformance } = useDatabase();

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['allClassesPerformance', selectedQuarter],
    queryFn: () => getAllClassesPerformance({ quarter: selectedQuarter }),
  });

  const kpis = useMemo(() => {
    if (!performanceData || performanceData.length === 0) {
      return {
        schoolAverage: 0,
        overallPassRate: 0,
        topClass: { className: 'N/A', averageGrade: 0 },
        bottomClass: { className: 'N/A', averageGrade: 0 },
      };
    }

    const totalStudents = performanceData.reduce((acc, c) => acc + c.studentCount, 0);
    const weightedAverageSum = performanceData.reduce((acc, c) => acc + (c.averageGrade * c.studentCount), 0);
    const schoolAverage = totalStudents > 0 ? weightedAverageSum / totalStudents : 0;

    const weightedPassRateSum = performanceData.reduce((acc, c) => acc + (c.passRate * c.studentCount), 0);
    const overallPassRate = totalStudents > 0 ? weightedPassRateSum / totalStudents : 0;
    
    const topClass = performanceData[0];
    const bottomClass = performanceData[performanceData.length - 1];

    return { schoolAverage, overallPassRate, topClass, bottomClass };
  }, [performanceData]);

  const handleBarClick = (data) => {
    if (data && data.payload) {
      setSelectedClass(data.payload);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Moyenne de l'École</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.schoolAverage.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Taux de Réussite Global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.overallPassRate.toFixed(2)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Meilleure Classe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.topClass.className}</div>
              <p className="text-xs text-muted-foreground">
                {kpis.topClass.averageGrade.toFixed(2)} de moyenne
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Classe en Difficulté</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.bottomClass.className}</div>
              <p className="text-xs text-muted-foreground">
                {kpis.bottomClass.averageGrade.toFixed(2)} de moyenne
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Analyse de Performance par Classe</CardTitle>
            <div className="w-[180px]">
              <Select onValueChange={(value) => setSelectedQuarter(value === 'all' ? null : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Année complète</SelectItem>
                  <SelectItem value="1">Trimestre 1</SelectItem>
                  <SelectItem value="2">Trimestre 2</SelectItem>
                  <SelectItem value="3">Trimestre 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Chargement des données...</p>
            ) : (
              <div className="space-y-4">
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={performanceData} onClick={handleBarClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="className" />
                      <YAxis domain={[0, 20]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="averageGrade" fill="#8884d8" name="Moyenne de la classe" style={{ cursor: 'pointer' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classe</TableHead>
                      <TableHead>Nombre d'élèves</TableHead>
                      <TableHead>Moyenne de la classe</TableHead>
                      <TableHead>Taux de réussite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceData?.map((data) => (
                      <TableRow key={data.className}>
                        <TableCell>{data.className}</TableCell>
                        <TableCell>{data.studentCount}</TableCell>
                        <TableCell>{data.averageGrade.toFixed(2)}</TableCell>
                        <TableCell>{data.passRate.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedClass && (
          <StudentResultsTable 
            classInfo={selectedClass} 
            quarter={selectedQuarter} 
            onClose={() => setSelectedClass(null)} 
          />
        )}
      </div>
    </MainLayout>
  );
};

export default ClassPerformance;