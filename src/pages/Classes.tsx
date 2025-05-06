
// Fix the addSubject function in Classes.tsx
// The error was: Property 'coefficient' is missing in type '{ name: string; classId: number; teacherId: number; }'

// Find the addSubject function and modify it to include coefficient:
const handleAddSubject = () => {
  if (!currentClass) return;
  
  try {
    addSubject({
      name: newSubjectName,
      classId: getClassIdByName(currentClass),
      teacherId: parseInt(newSubjectTeacherId),
      coefficient: parseInt(newSubjectCoefficient) || 1, // Add coefficient with default value of 1
    });
    
    // Refresh class details
    const updatedClassDetails = getClassDetails(currentClass);
    setClassDetails(updatedClassDetails);
    
    // Reset form
    setNewSubjectName('');
    setNewSubjectTeacherId('');
    setNewSubjectCoefficient('1');
    setIsAddingSubject(false);
    
    toast({
      title: "Matière ajoutée",
      description: `${newSubjectName} a été ajoutée à ${currentClass}.`,
    });
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Une erreur est survenue lors de l'ajout de la matière.",
      variant: "destructive",
    });
  }
};
