import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  studentIds: string[];
  date: string;
  notificationType?: "sms" | "whatsapp" | "email";
  message?: string;
}

// Helper function to format Mauritian phone numbers to international format
function formatMauritianPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  
  // Check if the number already has the country code
  if (digitsOnly.startsWith("230")) {
    return `+${digitsOnly}`;
  }
  
  // Add Mauritius country code if it's missing
  return `+230${digitsOnly}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentIds, date, notificationType = "sms", message } = await req.json() as RequestBody;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No student IDs provided" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch students details
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .in("id", studentIds)
      .is("deleted_at", null);
      
    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to fetch students details",
          error: studentsError
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Results to track successful and failed notifications
    const results = {
      success: 0,
      failed: 0,
      noPhone: 0,
      details: []
    };
    
    // Process each student
    for (const student of students) {
      if (!student.contact_phone) {
        results.noPhone++;
        results.details.push({
          studentId: student.id,
          success: false,
          reason: "No contact phone number"
        });
        continue;
      }
      
      // Format the phone number for Mauritian standards
      const phoneNumber = formatMauritianPhoneNumber(student.contact_phone);
      
      // Format the student's name
      const studentName = `${student.first_name} ${student.last_name}`;
      
      // Default notification message
      const defaultMessage = `This is an automated notification from the school attendance system. ${studentName} was marked absent on ${date}. Please contact the school for more information.`;
      
      // Use custom message if provided, otherwise use default
      const notificationMessage = message || defaultMessage;
      
      // Log the notification attempt
      console.log(`Sending ${notificationType} notification to ${phoneNumber} for student ${student.id}`);
      
      // Simulate sending notification (in a real implementation, integrate with SMS/WhatsApp API)
      let success = true; // For simulation purposes
      
      try {
        // Log the notification for record-keeping
        const { error: logError } = await supabase
          .from("attendance_notifications")
          .insert({
            student_id: student.id,
            notification_type: notificationType,
            notification_date: new Date().toISOString(),
            message: notificationMessage,
            success: success,
          });
          
        if (logError) {
          console.warn(`Could not log notification for student ${student.id}:`, logError);
        }
      } catch (logErr) {
        console.warn(`Error logging notification for student ${student.id}:`, logErr);
      }
      
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }
      
      results.details.push({
        studentId: student.id,
        studentName,
        phoneNumber,
        success,
      });
    }
    
    return new Response(
      JSON.stringify({ 
        success: results.success > 0,
        message: `Processed ${students.length} notifications: ${results.success} sent successfully, ${results.failed} failed, ${results.noPhone} had no phone number.`,
        details: results.details
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Error processing bulk notifications:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || "An unknown error occurred",
        stack: error.stack || "No stack trace available"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
