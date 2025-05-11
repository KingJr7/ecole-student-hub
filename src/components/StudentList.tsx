import { useEffect, useState } from 'react'
import { useDatabase } from '../hooks/useDatabase'

interface Student {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  address: string
  enrollmentDate: string
  status: string
  classId: number
  class?: {
    id: number
    name: string
  }
}

export function StudentList() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const { getAllStudents, createStudent } = useDatabase()

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const data = await getAllStudents()
      setStudents(data)
    } catch (error) {
      console.error('Erreur lors du chargement des étudiants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStudent = async () => {
    try {
      const newStudent = await createStudent({
        firstName: 'Nouveau',
        lastName: 'Étudiant',
        email: 'nouveau@example.com',
        phone: '0123456789',
        dateOfBirth: '2000-01-01',
        address: '123 Rue Example',
        enrollmentDate: new Date().toISOString(),
        status: 'active',
        classId: 1 // Assurez-vous que cette classe existe
      })
      setStudents([...students, newStudent])
    } catch (error) {
      console.error('Erreur lors de la création de l\'étudiant:', error)
    }
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Liste des Étudiants</h1>
      <button
        onClick={handleCreateStudent}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Ajouter un étudiant
      </button>
      <div className="grid gap-4">
        {students.map(student => (
          <div
            key={student.id}
            className="border p-4 rounded shadow"
          >
            <h2 className="text-xl font-semibold">
              {student.firstName} {student.lastName}
            </h2>
            <p>Email: {student.email}</p>
            <p>Téléphone: {student.phone}</p>
            <p>Classe: {student.class?.name || 'Non assigné'}</p>
            <p>Statut: {student.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
} 