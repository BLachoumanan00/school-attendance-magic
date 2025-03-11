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

// Helper function to send email notification
async function sendEmailNotification(to: string, subject: string, message: string): Promise<any> {
  console.log(`Sending email notification to ${to}`);
  
  try {
    // Simple email notification implementation using console log for now
    // In a real implementation, you would integrate with an email service here
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

serve(async (req) => {
  console.log("Processing bulk notifications request");
  
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
    
    const { studentIds, date, notificationType = "email", message } = requestBody as RequestBody;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      console.error("No student IDs provided");
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
    console.log("Creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch students details
    console.log(`Fetching details for ${studentIds.length} students`);
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
    
    console.log(`Found ${students?.length || 0} students of ${studentIds.length} requested`);
    
    // Results to track successful and failed notifications
    const results = {
      success: 0,
      failed: 0,
      noEmail: 0,
      details: []
    };
    
    // Process each student
    if (students) {
      for (const student of students) {
        if (!student.email) {
          console.log(`Student ${student.id} has no email address`);
          results.noEmail++;
          results.details.push({
            studentId: student.id,
            success: false,
            reason: "No email address"
          });
          continue;
        }
        
        // Get the email address for notification
        const emailAddress = student.email;
        console.log(`Using email address for student ${student.id}: ${emailAddress}`);
        
        // Format the student's name
        const studentName = `${student.first_name} ${student.last_name}`;
        
        // Default notification message
        const defaultMessage = `This is an automated notification from the school attendance system. ${studentName} was marked absent on ${date}. Please contact the school for more information.`;
        
        // Use custom message if provided, otherwise use default
        const notificationMessage = message || defaultMessage;
        
        // Log the notification attempt
        console.log(`Sending email notification to ${emailAddress} for student ${student.id}`);
        
        let success = false;
        let responseMessage = "";
        let emailResponse = null;
        
        try {
          // Send email notification
          const subject = `Attendance Notification for ${studentName}`;
          emailResponse = await sendEmailNotification(emailAddress, subject, notificationMessage);
          success = true;
          responseMessage = `Email sent successfully to ${emailAddress}`;
          
          console.log(responseMessage);
        } catch (notificationError) {
          console.error(`Failed to send notification to ${emailAddress}:`, notificationError);
          success = false;
          responseMessage = `Failed to send email: ${notificationError.message}`;
        }
        
        // Log the notification for record-keeping
        try {
          // Log the notification for record-keeping
          const { error: logError } = await supabase
            .from("attendance_notifications")
            .insert({
              student_id: student.id,
              notification_type: "email",
              notification_date: new Date().toISOString(),
              message: notificationMessage,
              success: success,
            });
            
          if (logError) {
            console.warn(`Could not log notification for student ${student.id}:`, logError);
            // Don't fail the entire request if just the logging fails
          } else {
            console.log(`Notification record created for student ${student.id}`);
          }
        } catch (logErr) {
          console.warn(`Error logging notification for student ${student.id}:`, logErr);
          // Don't fail the entire request if just the logging fails
        }
        
        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
        
        results.details.push({
          studentId: student.id,
          studentName,
          emailAddress,
          success,
          message: responseMessage,
          emailResponse: emailResponse ? { id: emailResponse.id } : null
        });
      }
    }
    
    console.log(`Processed ${results.success + results.failed + results.noEmail} notifications`);
    
    return new Response(
      JSON.stringify({ 
        success: results.success > 0,
        message: `Processed ${students?.length || 0} notifications: ${results.success} sent successfully, ${results.failed} failed, ${results.noEmail} had no email address.`,
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
