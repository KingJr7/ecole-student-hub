import { Employee } from '@/types';

let employees: Employee[] = [
  {
    id: 1,
    name: 'Dupont',
    first_name: 'Jean',
    phone: '0123456789',
    email: 'jean.dupont@school.com',
    adress: '10 Rue de la Paix, 75002 Paris',
    gender: 'Masculin',
    job_title: 'Secrétaire',
    salary: 180000,
    matricule: 'SCH-001',
  },
  {
    id: 2,
    name: 'Durand',
    first_name: 'Marie',
    phone: '0987654321',
    email: 'marie.durand@school.com',
    adress: '15 Avenue des Champs-Élysées, 75008 Paris',
    gender: 'Féminin',
    job_title: 'Comptable',
    salary: 220000,
    matricule: 'SCH-002',
  },
];

export const getEmployees = (): Promise<Employee[]> => {
  return Promise.resolve(employees);
};

export const addEmployee = (employee: Omit<Employee, 'id' | 'matricule'>): Promise<Employee> => {
  const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
  const matricule = `SCH-${String(newId).padStart(3, '0')}`;
  const newEmployee = { ...employee, id: newId, matricule };
  employees.push(newEmployee);
  return Promise.resolve(newEmployee);
};

export const updateEmployee = (id: number, data: Partial<Employee>): Promise<Employee> => {
  const index = employees.findIndex(e => e.id === id);
  if (index !== -1) {
    employees[index] = { ...employees[index], ...data };
    return Promise.resolve(employees[index]);
  }
  return Promise.reject(new Error("Employé non trouvé"));
};

export const deleteEmployee = (id: number): Promise<void> => {
  const initialLength = employees.length;
  employees = employees.filter(e => e.id !== id);
  if (employees.length === initialLength) {
    return Promise.reject(new Error("Employé non trouvé"));
  }
  return Promise.resolve();
};