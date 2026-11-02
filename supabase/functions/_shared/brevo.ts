export type EmailMessage = {
  to: string
  toName?: string
  subject: string
  htmlContent: string
  textContent: string
}

export async function sendBrevoEmail(message: EmailMessage) {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'MicroAxis Calendar'

  if (!apiKey || !senderEmail) {
    throw new Error('Brevo is not configured: set BREVO_API_KEY and BREVO_SENDER_EMAIL')
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: message.to, name: message.toName }],
      subject: message.subject,
      htmlContent: message.htmlContent,
      textContent: message.textContent,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Brevo rejected the email (${response.status}): ${detail.slice(0, 240)}`)
  }
}
