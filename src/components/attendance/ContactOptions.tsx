
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageSquare, RefreshCw } from "lucide-react";
import { Student } from "@/lib/types";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContactOptionsProps {
  student: Student;
  onRefreshData?: () => Promise<void>;
  isRefreshing?: boolean;
}

const ContactOptions: React.FC<ContactOptionsProps> = ({ 
  student, 
  onRefreshData,
  isRefreshing = false
}) => {
  const [isSending, setIsSending] = useState<{[key: string]: boolean}>({});

  const sendNotification = async (type: 'sms' | 'whatsapp' | 'email') => {
    if (!student) return;
    
    // Check if contact info exists
    if (type === 'sms' && !student.contactPhone) {
      toast({
        title: "Missing Contact Info",
        description: "No phone number available for SMS",
        variant: "destructive",
      });
      return;
    } else if (type === 'whatsapp' && !student.contactPhone) {
      toast({
        title: "Missing Contact Info",
        description: "No phone number available for WhatsApp",
        variant: "destructive",
      });
      return;
    } else if (type === 'email' && !student.email) {
      toast({
        title: "Missing Contact Info",
        description: "No email address available",
        variant: "destructive",
      });
      return;
    }

    setIsSending({...isSending, [type]: true});
    
    try {
      // Prepare the message
      const message = `Attendance notification for ${student.firstName} ${student.lastName} from the school attendance system.`;
      
      // Send notification
      const { data, error } = await supabase.functions.invoke('send-absence-notification', {
        body: {
          studentId: student.id,
          date: new Date().toLocaleDateString(),
          notificationType: type,
          message: message
        }
      });

      if (error) throw error;
      
      // Show success message
      const contactInfo = type === 'email' ? student.email : student.contactPhone;
      toast({
        title: "Notification Sent",
        description: `${type.toUpperCase()} notification sent to ${contactInfo}`,
      });
      
      // Log to console for debugging
      console.log("Notification sent:", data);
      
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setIsSending({...isSending, [type]: false});
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {student.contactPhone && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-blue-600 border-blue-600 hover:bg-blue-100 hover:text-blue-700"
            onClick={() => sendNotification('sms')}
            disabled={isSending['sms']}
          >
            {isSending['sms'] ? (
              <span className="animate-pulse">Sending...</span>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-1" />
                SMS
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700"
            onClick={() => sendNotification('whatsapp')}
            disabled={isSending['whatsapp']}
          >
            {isSending['whatsapp'] ? (
              <span className="animate-pulse">Sending...</span>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-1" />
                WhatsApp
              </>
            )}
          </Button>
        </>
      )}
      
      {student.email && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-orange-600 border-orange-600 hover:bg-orange-100 hover:text-orange-700"
          onClick={() => sendNotification('email')}
          disabled={isSending['email']}
        >
          {isSending['email'] ? (
            <span className="animate-pulse">Sending...</span>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-1" />
              Email
            </>
          )}
        </Button>
      )}
      
      {onRefreshData && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-gray-600 border-gray-600 hover:bg-gray-100 hover:text-gray-700"
          onClick={onRefreshData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      )}
    </div>
  );
};

export default ContactOptions;
