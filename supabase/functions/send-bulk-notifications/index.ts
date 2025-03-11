import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// For sending messages via Twilio
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

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
  if (!phoneNumber) return "";
  
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  
  // Check if the number already has the country code
  if (digitsOnly.startsWith("230")) {
    return `+${digitsOnly}`;
  }
  
  // Add Mauritius country code if it's missing
  return `+230${digitsOnly}`;
}

// Helper function to send WhatsApp message via Twilio
async function sendWhatsAppViaTwilio(to: string, message: string): Promise<any> {
  console.log(`Attempting to send WhatsApp message to ${to}`);
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    throw new Error("Missing Twilio credentials");
  }
  
  // The WhatsApp number must be in format 'whatsapp:+1234567890'
  const whatsappTo = `whatsapp:${to}`;
  const whatsappFrom = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
  
  try {
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const twilioResponse = await fetch(twilioEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      },
      body: new URLSearchParams({
        To: whatsappTo,
        From: whatsappFrom,
        Body: message,
      }),
    });
    
    const responseData = await twilioResponse.json();
    
    if (!twilioResponse.ok) {
      console.error("Twilio WhatsApp API error:", responseData);
      throw new Error(responseData.message || "Failed to send WhatsApp message");
    }
    
    console.log("WhatsApp message sent successfully:", responseData.sid);
    return responseData;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
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
    
    const { studentIds, date, notificationType = "whatsapp", message } = requestBody as RequestBody;
    
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
    
    // Check if Twilio credentials are available for WhatsApp
    if (notificationType === "whatsapp" && (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER)) {
      console.error("Missing Twilio credentials for WhatsApp notifications");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Server configuration error: Missing Twilio credentials for WhatsApp notifications"
        }),
        { 
          status: 500, 
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
    if (students) {
      for (const student of students) {
        if (!student.contact_phone) {
          console.log(`Student ${student.id} has no contact phone`);
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
        console.log(`Formatted phone number for student ${student.id}: ${phoneNumber}`);
        
        // Format the student's name
        const studentName = `${student.first_name} ${student.last_name}`;
        
        // Default notification message
        const defaultMessage = `This is an automated notification from the school attendance system. ${studentName} was marked absent on ${date}. Please contact the school for more information.`;
        
        // Use custom message if provided, otherwise use default
        const notificationMessage = message || defaultMessage;
        
        // Log the notification attempt
        console.log(`Sending ${notificationType} notification to ${phoneNumber} for student ${student.id}`);
        
        let success = false;
        let responseMessage = "";
        let twilioResponse = null;
        
        try {
          if (notificationType === "whatsapp") {
            // Send WhatsApp message using Twilio
            twilioResponse = await sendWhatsAppViaTwilio(phoneNumber, notificationMessage);
            success = true;
            responseMessage = `WhatsApp message sent successfully to ${phoneNumber}`;
          } else {
            // Fallback for other notification types (simulation for now)
            success = true;
            responseMessage = `${notificationType} notification sent successfully (simulated)`;
          }
          
          console.log(responseMessage);
        } catch (notificationError) {
          console.error(`Failed to send notification to ${phoneNumber}:`, notificationError);
          success = false;
          responseMessage = `Failed to send ${notificationType}: ${notificationError.message}`;
        }
        
        // Log the notification for record-keeping
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
          phoneNumber,
          success,
          message: responseMessage,
          twilioResponse: twilioResponse ? { sid: twilioResponse.sid } : null
        });
      }
    }
    
    console.log(`Processed ${results.success + results.failed + results.noPhone} notifications`);
    
    return new Response(
      JSON.stringify({ 
        success: results.success > 0,
        message: `Processed ${students?.length || 0} notifications: ${results.success} sent successfully, ${results.failed} failed, ${results.noPhone} had no phone number.`,
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
