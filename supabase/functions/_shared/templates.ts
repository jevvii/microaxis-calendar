export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function reminderEmail({
  recipientName,
  eventTitle,
  when,
  eventUrl,
  busyOnly = false,
}: {
  recipientName: string
  eventTitle: string
  when: string
  eventUrl: string
  busyOnly?: boolean
}) {
  const safeName = escapeHtml(recipientName)
  const safeTitle = escapeHtml(busyOnly ? 'A shared calendar event is coming up' : eventTitle)
  const safeWhen = escapeHtml(when)
  const safeUrl = escapeHtml(eventUrl)

  return {
    subject: busyOnly ? `Upcoming: ${safeWhen}` : `${safeTitle} · ${safeWhen}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; color: #141411; line-height: 1.6; max-width: 520px;">
        <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #76766c;">MicroAxis Calendar</p>
        <h1 style="font-size: 24px; letter-spacing: -0.03em; margin: 8px 0 12px;">${safeTitle}</h1>
        <p style="color: #4d4d45; margin: 0 0 8px;">${safeWhen}</p>
        <p style="color: #4d4d45;">Hello ${safeName}, this is a reminder for an event on your calendar.</p>
        <p style="margin: 24px 0;">
          <a href="${safeUrl}" style="background: #141411; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">Open the event</a>
        </p>
        <p style="font-size: 12px; color: #76766c;">Sent by MicroAxis Calendar. You can change delivery preferences in the app.</p>
      </div>
    `,
    textContent: `Hello ${recipientName}, this is a reminder for ${busyOnly ? 'a shared calendar event' : eventTitle} at ${when}. Open: ${eventUrl}`,
  }
}
