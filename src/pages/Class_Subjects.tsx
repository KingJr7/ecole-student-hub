import React, { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDatabase } from "@/hooks/useDatabase";

interface Class {
  id: number;
  name: string;
}
interface ClassSubject {
  id: number;
  classId: number;
  subjectName: string;
  coefficient: number;
}

// Ajout de la fonction updateClassSubject à useDatabase (à ajouter dans le hook)
// const updateClassSubject = (id: number, subjectName: string, coefficient: number) =>
//   window.electron.invoke('db:classSubjects:update', { id, subjectName, coefficient });

const ClassSubjects: React.FC = () => {
  const { getAllClasses, getClassSubjects, addClassSubject, deleteClassSubject, updateClassSubject } = useDatabase();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<ClassSubject[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [coefficient, setCoefficient] = useState(1);

  // Pour l'édition
  const [editId, setEditId] = useState<number | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editCoefficient, setEditCoefficient] = useState<number>(1);

  useEffect(() => {
    getAllClasses().then(setClasses);
  }, [getAllClasses]);

  useEffect(() => {
    if (selectedClassId) {
      getClassSubjects(selectedClassId).then(setSubjects);
    } else {
      setSubjects([]);
    }
  }, [selectedClassId, getClassSubjects]);

  const handleAddSubject = async () => {
    if (!selectedClassId || !subjectName || coefficient <= 0) return;
    await addClassSubject(selectedClassId, subjectName, coefficient);
    setSubjectName("");
    setCoefficient(1);
    getClassSubjects(selectedClassId).then(setSubjects);
  };

  const handleDeleteSubject = async (id: number) => {
    await deleteClassSubject(id);
    if (selectedClassId) getClassSubjects(selectedClassId).then(setSubjects);
  };

  const handleEditClick = (subject: ClassSubject) => {
    setEditId(subject.id);
    setEditSubjectName(subject.subjectName);
    setEditCoefficient(subject.coefficient);
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditSubjectName("");
    setEditCoefficient(1);
  };

  const handleEditSave = async (id: number) => {
    await updateClassSubject(id, editSubjectName, editCoefficient);
    if (selectedClassId) getClassSubjects(selectedClassId).then(setSubjects);
    setEditId(null);
    setEditSubjectName("");
    setEditCoefficient(1);
  };

  return (
    <MainLayout>
      <div className="p-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-6">
            <h2 className="text-xl font-bold mb-4">Matières par classe</h2>
            <div className="mb-4">
              <Label>Classe</Label>
              <select
                className="border rounded px-2 py-1 mt-1"
                value={selectedClassId ?? ""}
                onChange={e => setSelectedClassId(Number(e.target.value))}
              >
                <option value="">Sélectionner une classe</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {selectedClassId && (
              <>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Nom de la matière"
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0.1}
                    step={0.1}
                    placeholder="Coefficient"
                    value={coefficient}
                    onChange={e => setCoefficient(Number(e.target.value))}
                    className="w-24"
                  />
                  <Button onClick={handleAddSubject}>Ajouter</Button>
                </div>
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Matière</th>
                      <th className="border px-2 py-1">Coefficient</th>
                      <th className="border px-2 py-1">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map(subj => (
                      <tr key={subj.id}>
                        {editId === subj.id ? (
                          <>
                            <td className="border px-2 py-1">
                              <Input
                                value={editSubjectName}
                                onChange={e => setEditSubjectName(e.target.value)}
                                className="w-32"
                              />
                            </td>
                            <td className="border px-2 py-1">
                              <Input
                                type="number"
                                min={0.1}
                                step={0.1}
                                value={editCoefficient}
                                onChange={e => setEditCoefficient(Number(e.target.value))}
                                className="w-20"
                              />
                            </td>
                            <td className="border px-2 py-1 flex gap-1">
                              <Button onClick={() => handleEditSave(subj.id)} size="sm">Enregistrer</Button>
                              <Button onClick={handleEditCancel} variant="secondary" size="sm">Annuler</Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="border px-2 py-1">{subj.subjectName}</td>
                            <td className="border px-2 py-1">{subj.coefficient}</td>
                            <td className="border px-2 py-1 flex gap-1">
                              <Button onClick={() => handleEditClick(subj)} size="sm">Modifier</Button>
                              <Button variant="destructive" onClick={() => handleDeleteSubject(subj.id)} size="sm">Supprimer</Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ClassSubjects;
