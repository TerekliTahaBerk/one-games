export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const from = process.env.ONEGAMES_EMAIL_FROM?.trim() || "OneGames <hello@oneread.email>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${code} is your OneGames code`,
      text: `Your OneGames code is ${code}. It expires in 10 minutes.\n\nOne good game at a time.`,
      html: `<div style="background:#fff;padding:40px 20px;color:#1a1a1a;font-family:Arial,sans-serif">
        <div style="max-width:480px;margin:auto">
          <p style="font-family:Georgia,serif;font-size:28px;margin:0 0 32px">OneGames</p>
          <p style="font-size:14px;color:#52525b">Your verification code is:</p>
          <p style="font-size:36px;letter-spacing:.25em;font-weight:600;margin:20px 0">${code}</p>
          <p style="font-size:13px;color:#71717a;line-height:1.6">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
        </div>
      </div>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
}
