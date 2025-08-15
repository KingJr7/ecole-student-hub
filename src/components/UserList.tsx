import { useEffect, useState } from 'react'
import { useDatabase } from '../hooks/useDatabase'

interface User {
  id: number
  email: string
  name: string | null
  createdAt: string
  updatedAt: string
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { getAllUsers, createUser, updateUser, deleteUser } = useDatabase()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await getAllUsers()
      setUsers(data)
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      const newUser = await createUser({
        email: 'nouveau@example.com',
        name: 'Nouvel Utilisateur'
      })
      setUsers([...users, newUser])
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error)
    }
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  return (
    <div>
      <h1>Liste des Utilisateurs</h1>
      <button onClick={handleCreateUser}>Ajouter un utilisateur</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  )
} 