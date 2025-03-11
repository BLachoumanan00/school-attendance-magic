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
    
    const { studentIds, date, notificationType = "sms", message } = requestBody as RequestBody;
    
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
      noContact: 0,
      smsCount: 0,
      emailCount: 0,
      details: []
    };
    
    // Process each student
    if (students) {
      for (const student of students) {
        // Determine if we can send SMS or need to fallback to email
        const canSendSms = notificationType === "sms" && !!student.contactPhone;
        const canSendEmail = !!student.email;
        
        if (!canSendSms && !canSendEmail) {
          console.log(`Student ${student.id} has no contact information`);
          results.noContact++;
          results.details.push({
            studentId: student.id,
            success: false,
            reason: "No contact information"
          });
          continue;
        }
        
        // Format the student's name
        const studentName = `${student.first_name} ${student.last_name}`;
        
        // Default notification message
        const defaultMessage = `This is an automated notification from the school attendance system. ${studentName} was marked absent on ${date}. Please contact the school for more information.`;
        
        // Use custom message if provided, otherwise use default
        const notificationMessage = message || defaultMessage;
        
        let success = false;
        let responseMessage = "";
        let notificationResponse = null;
        let usedChannel = "none";
        
        // Try to send SMS first if it's the preferred method and contact info is available
        if (canSendSms) {
          try {
            console.log(`Sending SMS notification to ${student.contactPhone} for student ${student.id}`);
            notificationResponse = await sendSmsNotification(student.contactPhone, notificationMessage);
            success = true;
            responseMessage = `SMS sent successfully to ${student.contactPhone}`;
            usedChannel = "sms";
            results.smsCount++;
          } catch (notificationError) {
            console.error(`Failed to send SMS to ${student.contactPhone}:`, notificationError);
            
            // If SMS fails and email is available, try email as fallback
            if (canSendEmail) {
              try {
                console.log(`Falling back to email notification for student ${student.id}`);
                const subject = `Attendance Notification for ${studentName}`;
                notificationResponse = await sendEmailNotification(student.email, subject, notificationMessage);
                success = true;
                responseMessage = `Email sent successfully to ${student.email} (SMS failed)`;
                usedChannel = "email";
                results.emailCount++;
              } catch (emailError) {
                console.error(`Failed to send email to ${student.email}:`, emailError);
                success = false;
                responseMessage = `Failed to send both SMS and email: ${emailError.message}`;
              }
            } else {
              success = false;
              responseMessage = `Failed to send SMS: ${notificationError.message}`;
            }
          }
        }
        // If SMS is not available or not preferred, try email
        else if (canSendEmail) {
          try {
            console.log(`Sending email notification to ${student.email} for student ${student.id}`);
            const subject = `Attendance Notification for ${studentName}`;
            notificationResponse = await sendEmailNotification(student.email, subject, notificationMessage);
            success = true;
            responseMessage = `Email sent successfully to ${student.email}`;
            usedChannel = "email";
            results.emailCount++;
          } catch (emailError) {
            console.error(`Failed to send email to ${student.email}:`, emailError);
            success = false;
            responseMessage = `Failed to send email: ${emailError.message}`;
          }
        }
        
        console.log(responseMessage);
        
        // Log the notification for record-keeping
        try {
          const { error: logError } = await supabase
            .from("attendance_notifications")
            .insert({
              student_id: student.id,
              notification_type: usedChannel,
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
          contactInfo: usedChannel === "sms" ? student.contactPhone : student.email,
          channel: usedChannel,
          success,
          message: responseMessage,
          notificationResponse: notificationResponse ? { id: notificationResponse.id } : null
        });
      }
    }
    
    console.log(`Processed ${results.success + results.failed + results.noContact} notifications`);
    
    return new Response(
      JSON.stringify({ 
        success: results.success > 0,
        message: `Processed ${students?.length || 0} notifications: ${results.success} sent successfully (${results.smsCount} SMS, ${results.emailCount} email), ${results.failed} failed, ${results.noContact} had no contact information.`,
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
