
import { Student, ImportResult } from './types';

export const parseCSV = (csvContent: string): ImportResult => {
  try {
    // Split the content by line breaks
    const lines = csvContent.split(/\r\n|\n/);
    
    // If no lines, return error
    if (lines.length < 2) {
      return {
        success: false,
        message: 'CSV file is empty or invalid',
        errors: ['No data found in the file']
      };
    }

    // Extract headers from the first line
    const headers = lines[0].split(',');
    const requiredHeaders = ['studentId', 'firstName', 'lastName', 'class', 'gradeLevel'];
    
    // Check if required headers are present
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      return {
        success: false,
        message: 'Missing required headers in CSV file',
        errors: [`Missing headers: ${missingHeaders.join(', ')}`]
      };
    }
    
    const students: Student[] = [];
    const errors: string[] = [];
    
    // Process each data line
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',');
      
      // Check if line has the correct number of fields
      if (values.length !== headers.length) {
        errors.push(`Line ${i + 1}: Incorrect number of fields`);
        continue;
      }
      
      // Create a student object
      const student: any = {};
      headers.forEach((header, index) => {
        student[header] = values[index];
      });
      
      // Validate required fields
      let isValid = true;
      for (const field of requiredHeaders) {
        if (!student[field]) {
          errors.push(`Line ${i + 1}: Missing ${field}`);
          isValid = false;
          break;
        }
      }
      
      // Type conversion for gradeLevel
      if (isValid) {
        student.gradeLevel = parseInt(student.gradeLevel);
        if (isNaN(student.gradeLevel)) {
          errors.push(`Line ${i + 1}: gradeLevel must be a number`);
          isValid = false;
        }
      }
      
      // Generate an id if valid
      if (isValid) {
        student.id = crypto.randomUUID();
        students.push(student as Student);
      }
    }
    
    if (students.length === 0) {
      return {
        success: false,
        message: 'No valid students found in the CSV file',
        errors
      };
    }
    
    return {
      success: true,
      message: `Successfully imported ${students.length} students with ${errors.length} errors`,
      data: students,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to parse CSV file',
      errors: [(error as Error).message]
    };
  }
};

export const getCSVTemplate = (): string => {
  return 'studentId,firstName,lastName,class,gradeLevel,email,contactPhone\n' +
    '12345,John,Doe,10A,10,john.doe@school.edu,555-123-4567\n' +
    '12346,Jane,Smith,10A,10,jane.smith@school.edu,555-234-5678';
};

export const downloadCSVTemplate = () => {
  const templateContent = getCSVTemplate();
  const blob = new Blob([templateContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
