import { useState, useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDatabase } from '@/hooks/useDatabase';
import { LessonForm } from '../components/LessonForm';
import { ScheduleManager } from '../components/ScheduleManager';
import { PlusCircle, Edit, Trash2, Clock } from 'lucide-react';

const LessonsPage = () => {
  const { lessons, getLessons, deleteLesson, classes, teachers, subjects } = useDatabase();
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    getLessons();
  }, [getLessons]);

  const handleEditLesson = (lesson) => {
    setSelectedLesson(lesson);
    setIsLessonDialogOpen(true);
  };

  const handleAddNewLesson = () => {
    setSelectedLesson(null);
    setIsLessonDialogOpen(true);
  };

  const handleManageSchedule = (lesson) => {
    setSelectedLesson(lesson);
    setIsScheduleDialogOpen(true);
  };

  const handleDeleteLesson = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette leçon ?')) {
      await deleteLesson(id);
    }
  };

  const closeDialogs = () => {
    setIsLessonDialogOpen(false);
    setIsScheduleDialogOpen(false);
    getLessons(); // Re-fetch lessons after any change
  };

  const getRelationName = (id, collection) => {
    const item = collection.find(c => c.id === id);
    if (collection === teachers) return item ? `${item.firstName} ${item.lastName}` : 'N/A';
    return item ? item.name : 'N/A';
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Leçons</h1>
        <Button onClick={handleAddNewLesson}>
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Leçon
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Classe</TableHead>
            <TableHead>Matière</TableHead>
            <TableHead>Professeur</TableHead>
            <TableHead>Année Scolaire</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((lesson) => (
            <TableRow key={lesson.id}>
              <TableCell>{getRelationName(lesson.classId, classes)}</TableCell>
              <TableCell>{getRelationName(lesson.subjectId, subjects)}</TableCell>
              <TableCell>{getRelationName(lesson.teacherId, teachers)}</TableCell>
              <TableCell>{lesson.schoolYear}</TableCell>
              <TableCell className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleManageSchedule(lesson)}>
                  <Clock className="mr-2 h-4 w-4" /> Horaire
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEditLesson(lesson)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteLesson(lesson.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Lesson Form Dialog */}
      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLesson ? 'Modifier la Leçon' : 'Ajouter une Leçon'}</DialogTitle>
          </DialogHeader>
          <LessonForm lesson={selectedLesson} onSuccess={closeDialogs} />
        </DialogContent>
      </Dialog>

      {/* Schedule Manager Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gérer l'horaire de la leçon</DialogTitle>
          </DialogHeader>
          {selectedLesson && <ScheduleManager lesson={selectedLesson} onSuccess={closeDialogs} />}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default LessonsPage;
