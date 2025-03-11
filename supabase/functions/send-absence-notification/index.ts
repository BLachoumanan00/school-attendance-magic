
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
  studentId: string;
  date: string;
  notificationType?: "sms" | "whatsapp" | "email";
  message?: string;
}

// Helper function to send email notification (fallback)
async function sendEmailNotification(to: string, subject: string, message: string): Promise<any> {
  console.log(`Sending email notification to ${to}`);
  
  try {
    // Simple email notification implementation using console log for now
    console.log(`EMAIL TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`MESSAGE: ${message}`);
    
    // Simulating successful email delivery
    return {
      success: true,
      id: `email-${Date.now()}`,
      to: to
    };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Helper function to send SMS notification
async function sendSmsNotification(to: string, message: string): Promise<any> {
  console.log(`Sending SMS notification to ${to}`);
  
  try {
    // Simple SMS notification implementation using console log
    // In a real implementation, you would integrate with an SMS service here
    console.log(`SMS TO: ${to}`);
    console.log(`MESSAGE: ${message}`);
    
    // Simulating successful SMS delivery
    return {
      success: true,
      id: `sms-${Date.now()}`,
      to: to
    };
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
}

serve(async (req) => {
  console.log("Processing notification request");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Server configuration error: Missing Supabase credentials"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody));
    
    const { studentId, date, notificationType = "sms", message } = requestBody as RequestBody;
    
    if (!studentId || !date) {
      console.error("Missing required parameters: studentId or date");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Student ID and date are required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Create Supabase client
    console.log("Creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch student details
    console.log(`Fetching student details for ID: ${studentId}`);
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .is("deleted_at", null)
      .single();
      
    if (studentError) {
      console.error("Error fetching student:", studentError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to fetch student details",
          error: studentError
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!student) {
      console.error("Student not found");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Student not found" 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Format the student's name
    const studentName = `${student.first_name} ${student.last_name}`;
    
    // Default notification message
    const defaultMessage = `This is an automated notification from the school attendance system. ${studentName} was marked absent on ${date}. Please contact the school for more information.`;
    
    // Use custom message if provided, otherwise use default
    const notificationMessage = message || defaultMessage;
    
    let success = false;
    let responseMessage = "";
    let notificationData = null;
    let notificationChannel = notificationType;
    
    // Determine which notification method to use
    if (notificationType === "sms" && student.contactPhone) {
      try {
        console.log(`Sending SMS notification to ${student.contactPhone} for student ${studentId}`);
        notificationData = await sendSmsNotification(student.contactPhone, notificationMessage);
        success = true;
        responseMessage = `SMS notification sent successfully to ${student.contactPhone}`;
      } catch (notificationError) {
        console.error("Failed to send SMS notification:", notificationError);
        success = false;
        responseMessage = `Failed to send SMS notification: ${notificationError.message}`;
      }
    } else if (student.email) {
      // Fallback to email if SMS is requested but no phone number is available or if email is requested
      try {
        console.log(`Sending email notification to ${student.email} for student ${studentId}`);
        const subject = `Attendance Notification for ${studentName}`;
        notificationData = await sendEmailNotification(student.email, subject, notificationMessage);
        success = true;
        responseMessage = `Email notification sent successfully to ${student.email}`;
        notificationChannel = "email";
      } catch (notificationError) {
        console.error("Failed to send email notification:", notificationError);
        success = false;
        responseMessage = `Failed to send email notification: ${notificationError.message}`;
      }
    } else {
      console.error("Student has no contact information");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Student has no contact information for notifications" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log(responseMessage);
    
    // Log the notification for record-keeping
    try {
      console.log("Logging notification record to database");
      const { error: logError } = await supabase
        .from("attendance_notifications")
        .insert({
          student_id: studentId,
          notification_type: notificationChannel,
          notification_date: new Date().toISOString(),
          message: notificationMessage,
          success: success,
        });
        
      if (logError) {
        console.warn("Could not log notification:", logError);
        // Don't fail the entire request if just the logging fails
      } else {
        console.log("Notification record created successfully");
      }
    } catch (logErr) {
      console.warn("Error logging notification:", logErr);
      // Don't fail the entire request if just the logging fails
    }
    
    return new Response(
      JSON.stringify({ 
        success, 
        message: responseMessage,
        channel: notificationChannel,
        studentId,
        contactInfo: notificationChannel === "sms" ? student.contactPhone : student.email,
        notificationResponse: notificationData
      }),
      { 
        status: success ? 200 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Error processing request:", error);
    
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
