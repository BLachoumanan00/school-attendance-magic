
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Student } from "./types";

// Log notification to the database
export const logNotification = async (
  studentId: string, 
  notificationType: string, 
  message: string, 
  success: boolean
): Promise<void> => {
  try {
    await supabase
      .from("attendance_notifications")
      .insert({
        student_id: studentId,
        notification_type: notificationType,
        notification_date: new Date().toISOString(),
        message: message,
        success: success,
      });
    
    console.log("Notification logged successfully");
  } catch (error) {
    console.error("Error logging notification:", error);
  }
};

// Send a notification to a single student
export const sendStudentNotification = async (
  student: Student, 
  message: string, 
  notificationType: 'sms' | 'email' = 'sms'
): Promise<boolean> => {
  console.log(`Sending ${notificationType} notification to ${student.firstName} ${student.lastName}`);
  
  try {
    // Check if we have contact info
    if (notificationType === 'sms' && !student.contactPhone) {
      if (student.email) {
        // Fall back to email
        notificationType = 'email';
      } else {
        throw new Error("No contact information available");
      }
    } else if (notificationType === 'email' && !student.email) {
      if (student.contactPhone) {
        // Fall back to SMS
        notificationType = 'sms';
      } else {
        throw new Error("No contact information available");
      }
    }
    
    // In a real application, this would send actual SMS or emails
    // For now, we'll simulate successful notifications and show them in the UI
    const contactInfo = notificationType === 'sms' ? student.contactPhone : student.email;
    
    // Log notification details
    console.log(`SIMULATED ${notificationType.toUpperCase()} NOTIFICATION:`);
    console.log(`To: ${contactInfo}`);
    console.log(`Message: ${message}`);
    
    // Log to database
    await logNotification(
      student.id,
      notificationType,
      message,
      true
    );
    
    // Show success message to the user
    toast({
      title: `${notificationType.toUpperCase()} Notification Sent`,
      description: `A notification was sent to ${student.firstName} ${student.lastName} via ${notificationType} at ${contactInfo}`,
      duration: 5000
    });
    
    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    
    // Log failed notification
    await logNotification(
      student.id,
      notificationType,
      message,
      false
    );
    
    // Show error to the user
    toast({
      title: "Notification Failed",
      description: `Could not send notification to ${student.firstName} ${student.lastName}: ${error.message}`,
      variant: "destructive",
      duration: 5000
    });
    
    return false;
  }
};

// Send notifications to multiple students
export const sendBulkNotifications = async (
  students: Student[],
  message: string,
  notificationType: 'sms' | 'email' = 'sms'
): Promise<{success: number, failed: number}> => {
  console.log(`Sending bulk ${notificationType} notifications to ${students.length} students`);
  
  const results = {
    success: 0,
    failed: 0
  };
  
  // Process students in batches to avoid overwhelming the browser
  const batchSize = 5;
  
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    const batchPromises = batch.map(student => 
      sendStudentNotification(student, message, notificationType)
        .then(success => {
          if (success) {
            results.success++;
          } else {
            results.failed++;
          }
        })
        .catch(() => {
          results.failed++;
        })
    );
    
    // Process each batch sequentially
    await Promise.all(batchPromises);
  }
  
  // Show summary toast
  toast({
    title: "Bulk Notification Complete",
    description: `Sent ${results.success} notifications successfully, ${results.failed} failed.`,
    duration: 5000
  });
  
  return results;
};
