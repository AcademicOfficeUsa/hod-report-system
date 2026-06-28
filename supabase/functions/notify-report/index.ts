import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  type: 'report_submitted' | 'edit_requested' | 'edit_approved' | 'edit_rejected';
  reportId: string;
  departmentId: string;
  hodName: string;
  month: string;
  year: number;
  reason?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, reportId, departmentId, hodName, month, year, reason }: NotificationRequest = await req.json();

    // Email recipients based on notification type
    const recipientEmail = 'stephen.a@schoolofstjude.co.tz'; // Assistant Academic Deputy

    let subject = '';
    let body = '';

    switch (type) {
      case 'report_submitted':
        subject = `HOD Report Submitted: ${departmentId} - ${month} ${year}`;
        body = `
A new HOD monthly report has been submitted.

Department: ${departmentId}
HOD: ${hodName}
Month/Year: ${month} ${year}
Report ID: ${reportId}

Please log in to the system to review the report.

Best regards,
HOD Monthly Report System
School of St. Jude
        `;
        break;

      case 'edit_requested':
        subject = `Edit Request: ${departmentId} - ${month} ${year}`;
        body = `
An HOD has requested edit access to a submitted report.

Department: ${departmentId}
HOD: ${hodName}
Month/Year: ${month} ${year}
Report ID: ${reportId}

Reason given:
${reason || 'No reason provided'}

Please review this request in the admin dashboard.

Best regards,
HOD Monthly Report System
School of St. Jude
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ message: 'Notification type not handled for email' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Note: In production, you would integrate with an email service like Resend, SendGrid, etc.
    // For now, we'll just log the notification
    console.log('Email notification would be sent:');
    console.log('To:', recipientEmail);
    console.log('Subject:', subject);
    console.log('Body:', body);

    // Simulate email sending (in production, replace with actual email service)
    // Example with Resend:
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'reports@schoolofstjude.co.tz',
    //     to: recipientEmail,
    //     subject,
    //     text: body,
    //   }),
    // });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification processed',
        email: {
          to: recipientEmail,
          subject,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
