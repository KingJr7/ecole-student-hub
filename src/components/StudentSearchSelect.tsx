
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Student } from "@/types";

interface StudentSearchSelectProps {
  students: Student[];
  value?: number;
  onValueChange: (studentId: number) => void;
  placeholder?: string;
  className?: string;
}

const StudentSearchSelect = ({
  students = [],  // Provide default empty array
  value,
  onValueChange,
  placeholder = "Rechercher un élève...",
  className,
}: StudentSearchSelectProps) => {
  const [open, setOpen] = useState(false);
  
  // Ensure students is an array before finding
  const selectedStudent = students && Array.isArray(students) 
    ? students.find(student => student.id === value)
    : undefined;
  
  // Create a safe version of students to use in the CommandGroup
  const safeStudents = students && Array.isArray(students) ? students : [];
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value && selectedStudent
            ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>Aucun élève trouvé</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {safeStudents.map((student) => (
              <CommandItem
                key={student.id}
                value={`${student.firstName} ${student.lastName}`.toLowerCase()}
                onSelect={() => {
                  onValueChange(student.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === student.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {student.firstName} {student.lastName} - {student.className}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default StudentSearchSelect;
