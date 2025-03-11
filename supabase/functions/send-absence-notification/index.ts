
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
  studentId: string;
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
    
    const { studentId, date, notificationType = "whatsapp", message } = requestBody as RequestBody;
    
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
    
    if (!student.contact_phone) {
      console.error("Student has no contact phone number");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Student has no contact phone number" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Format the phone number for Mauritian standards
    const phoneNumber = formatMauritianPhoneNumber(student.contact_phone);
    console.log(`Formatted phone number: ${phoneNumber}`);
    
    // Format the student's name
    const studentName = `${student.first_name} ${student.last_name}`;
    
    // Default notification message
    const defaultMessage = `This is an automated notification from the school attendance system. ${studentName} was marked absent on ${date}. Please contact the school for more information.`;
    
    // Use custom message if provided, otherwise use default
    const notificationMessage = message || defaultMessage;
    
    // Log the notification attempt
    console.log(`Sending ${notificationType} notification to ${phoneNumber} for student ${studentId}`);
    
    let success = false;
    let responseMessage = "";
    let twilioData = null;
    
    try {
      if (notificationType === "whatsapp") {
        // Send WhatsApp message using Twilio
        twilioData = await sendWhatsAppViaTwilio(phoneNumber, notificationMessage);
        success = true;
        responseMessage = `WhatsApp notification sent successfully to ${phoneNumber}`;
      } else {
        // Fallback for other notification types (simulation for now)
        success = true;
        responseMessage = `${notificationType} notification sent successfully (simulated)`;
      }
    } catch (notificationError) {
      console.error("Failed to send notification:", notificationError);
      success = false;
      responseMessage = `Failed to send ${notificationType} notification: ${notificationError.message}`;
    }
    
    console.log(responseMessage);
    
    // Log the notification for record-keeping
    try {
      console.log("Logging notification record to database");
      const { error: logError } = await supabase
        .from("attendance_notifications")
        .insert({
          student_id: studentId,
          notification_type: notificationType,
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
        channel: notificationType,
        studentId,
        phoneNumber,
        twilioResponse: twilioData
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
