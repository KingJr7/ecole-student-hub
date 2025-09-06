import { useQuery } from '@tanstack/react-query';
import { useDatabase } from '@/hooks/useDatabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StudentResultsTable = ({ classInfo, quarter, onClose }) => {
  const { getClassResults, getClassTrend } = useDatabase();

  const { data: studentResults, isLoading: isLoadingResults } = useQuery({
    queryKey: ['classResults', classInfo.id, quarter],
    queryFn: () => getClassResults(classInfo.id, quarter),
    enabled: !!classInfo.id,
  });

  const { data: trendData, isLoading: isLoadingTrend } = useQuery({
    queryKey: ['classTrend', classInfo.id],
    queryFn: () => getClassTrend({ classId: classInfo.id }),
    enabled: !!classInfo.id,
  });

  return (
    <div className="mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Résultats détaillés pour la classe : {classInfo.className}</CardTitle>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Évolution de la moyenne de la classe</h3>
            {isLoadingTrend ? (
              <p>Chargement du graphique...</p>
            ) : (
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis domain={[0, 20]}/>
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="average" stroke="#8884d8" name="Moyenne" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Résultats individuels</h3>
            {isLoadingResults ? (
              <p>Chargement des résultats...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rang</TableHead>
                    <TableHead>Nom de l'élève</TableHead>
                    <TableHead>Moyenne</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentResults?.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.rank}</TableCell>
                      <TableCell>{student.studentName}</TableCell>
                      <TableCell>{student.average.toFixed(2)}</TableCell>
                      <TableCell>{student.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentResultsTable;