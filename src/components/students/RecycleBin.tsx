
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student } from "@/lib/types";
import { Search, RotateCcw, Trash2, CheckSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface RecycleBinProps {
  students: Student[];
  isLoading: boolean;
  onRestoreStudent: (studentId: string) => void;
  onDeletePermanently: (studentId: string) => void;
}

const RecycleBin = ({ 
  students,
  isLoading,
  onRestoreStudent,
  onDeletePermanently
}: RecycleBinProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.includes(searchTerm) ||
    student.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    } else {
      setSelectedStudents(prev => [...prev, studentId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      // If all are selected, deselect all
      setSelectedStudents([]);
    } else {
      // Select all
      setSelectedStudents(filteredStudents.map(student => student.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedStudents.length === 0) return;
    
    // Confirm before deleting multiple students
    if (window.confirm(`Are you sure you want to permanently delete ${selectedStudents.length} student(s)?`)) {
      selectedStudents.forEach(studentId => {
        onDeletePermanently(studentId);
      });
      setSelectedStudents([]);
    }
  };

  if (isLoading) {
    return <div>Loading deleted students...</div>;
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deleted students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleSelectAll}
          >
            <CheckSquare className="h-4 w-4" />
            {selectedStudents.length === filteredStudents.length 
              ? "Deselect All" 
              : "Select All"}
          </Button>
          
          {selectedStudents.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="flex items-center gap-2"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedStudents.length})
            </Button>
          )}
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox 
                  checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <TableRow key={student.id} className="group transition-all-200">
                  <TableCell>
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleToggleStudent(student.id)}
                      aria-label={`Select ${student.firstName} ${student.lastName}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{student.studentId}</TableCell>
                  <TableCell>{student.lastName}, {student.firstName}</TableCell>
                  <TableCell>{student.class}</TableCell>
                  <TableCell>
                    {student.deletedAt && formatDistanceToNow(new Date(student.deletedAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => onRestoreStudent(student.id)}
                        title="Restore Student"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDeletePermanently(student.id)}
                        title="Delete Permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No deleted students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RecycleBin;
