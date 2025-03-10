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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, date, notificationType = "sms", message } = await req.json() as RequestBody;
    
    if (!studentId || !date) {
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch student details
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
          message: "Failed to fetch student details" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!student.contact_phone) {
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
    
    // Format the phone number (remove spaces, dashes, etc.)
    const phoneNumber = student.contact_phone.replace(/\D/g, "");
    
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
      responseMessage = "SMS notification sent successfully (simulated)";
    } else if (notificationType === "whatsapp") {
      // For WhatsApp, you would integrate with the WhatsApp Business API
      // This is just a simulation
      success = true;
      responseMessage = "WhatsApp notification sent successfully (simulated)";
    } else {
      // Email fallback or other notification types
      success = true;
      responseMessage = `${notificationType} notification sent successfully (simulated)`;
    }
    
    // Log the notification for record-keeping
    const { error: logError } = await supabase
      .from("attendance_notifications")
      .insert({
        student_id: studentId,
        notification_type: notificationType,
        notification_date: new Date().toISOString(),
        message: notificationMessage,
        success: success,
      })
      .select()
      .single();
      
    if (logError) {
      console.warn("Could not log notification:", logError);
    }
    
    return new Response(
      JSON.stringify({ 
        success, 
        message: responseMessage,
        channel: notificationType,
        studentId
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
        message: error.message || "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
