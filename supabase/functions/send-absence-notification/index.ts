import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// For sending SMS via Twilio (as an example)
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

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

serve(async (req) => {
  console.log("Processing notification request");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    // Simulate sending notification
    let success = true; // For simulation purposes
    let responseMessage = "";
    
    // In a real implementation, you would use the Twilio API or another service
    if (notificationType === "sms" && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      // This is where you would integrate with Twilio for SMS
      /* 
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: TWILIO_PHONE_NUMBER,
          Body: notificationMessage,
        }),
      });
      
      const twilioData = await twilioResponse.json();
      success = twilioResponse.ok;
      responseMessage = success ? "SMS sent successfully" : `Failed to send SMS: ${twilioData.message}`;
      */
      
      // For now, simulate a successful response
      success = true;
      responseMessage = `SMS notification sent successfully (simulated) to ${phoneNumber}`;
    } else if (notificationType === "whatsapp") {
      // For WhatsApp, you would integrate with the WhatsApp Business API
      // This is just a simulation
      success = true;
      responseMessage = `WhatsApp notification sent successfully (simulated) to ${phoneNumber}`;
    } else {
      // Email fallback or other notification types
      success = true;
      responseMessage = `${notificationType} notification sent successfully (simulated)`;
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
      } else {
        console.log("Notification record created successfully");
      }
    } catch (logErr) {
      console.warn("Error logging notification:", logErr);
    }
    
    return new Response(
      JSON.stringify({ 
        success, 
        message: responseMessage,
        channel: notificationType,
        studentId,
        phoneNumber 
      }),
      { 
        status: 200, 
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
