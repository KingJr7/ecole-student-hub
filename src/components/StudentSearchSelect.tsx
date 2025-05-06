import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
  students = [],
  value,
  onValueChange,
  placeholder = "Rechercher un élève...",
  className,
}: StudentSearchSelectProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const safeStudents = Array.isArray(students) ? students : [];
  const selectedStudent = value ? safeStudents.find(student => student.id === value) : null;

  const filteredStudents = safeStudents.filter(student => {
    const searchString = `${student.firstName} ${student.lastName} ${student.className}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStudentSelect = (student: Student) => {
    onValueChange(student.id);
    setSearchTerm(`${student.firstName} ${student.lastName}`);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (selectedStudent) {
              setSearchTerm(`${selectedStudent.firstName} ${selectedStudent.lastName}`);
            }
            setIsOpen(true);
          }}
          className="pl-8"
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className={cn(
                  "px-4 py-2 cursor-pointer hover:bg-gray-100",
                  value === student.id && "bg-gray-100"
                )}
                onClick={() => handleStudentSelect(student)}
              >
                {student.firstName} {student.lastName} - {student.className}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">Aucun élève trouvé</div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSearchSelect;
