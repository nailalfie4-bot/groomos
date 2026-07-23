/**
 * Plain, warm, on-brand HTML email templates. Inline styles only (email clients
 * strip <style>), tables kept simple. Every string is escaped before it lands
 * in the markup.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(businessName: string, heading: string, bodyHtml: string, logoUrl?: string): string {
  // Only hosted (https) logos render reliably in email clients; a data URL from
  // the demo is skipped in favour of the business-name label.
  const logo =
    logoUrl && /^https:\/\//.test(logoUrl)
      ? `<img src="${logoUrl}" alt="${esc(businessName)}" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:12px;object-fit:cover;margin:0 0 12px;" />`
      : "";
  return `<!doctype html><html><body style="margin:0;background:#FCF6F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2A2422;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    ${logo}
    <p style="margin:0 0 16px;font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#C9756B;">${esc(businessName)}</p>
    <div style="background:#FFFFFF;border:1px solid #F1DEDA;border-radius:16px;padding:24px;">
      <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#2A2422;">${esc(heading)}</h1>
      ${bodyHtml}
    </div>
    <p style="margin:16px 4px 0;font-size:12px;color:#B3A39E;">Sent by ${esc(businessName)} via GroomOS. If this isn't for you, you can ignore it.</p>
  </div>
</body></html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:#8A7470;">${esc(label)}</td>
    <td style="padding:6px 0;font-size:14px;font-weight:600;color:#2A2422;text-align:right;">${esc(value)}</td>
  </tr>`;
}

export type GroomEmailData = {
  businessName: string;
  firstName: string;
  petName: string;
  serviceName: string;
  whenLabel: string; // e.g. "Tue 14 Jul at 1:30 pm"
  address?: string;
  depositLabel?: string; // e.g. "£10 deposit secures your slot"
  addons?: string[]; // chosen extras, e.g. ["Nail trim", "Teeth cleaning"]
  logoUrl?: string; // hosted business logo (https) shown in the email header
};

/** Reminder sent ~24h before an appointment (no-show protection). */
export function appointmentReminderEmail(d: GroomEmailData): { subject: string; html: string } {
  const rows = [
    detailRow("Groom", d.serviceName),
    d.addons && d.addons.length ? detailRow("Extras", d.addons.join(", ")) : "",
    detailRow("When", d.whenLabel),
    detailRow("Dog", d.petName),
    d.address ? detailRow("Where", d.address) : "",
  ].join("");
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8A7470;">Hi ${esc(d.firstName)}, just a friendly reminder that ${esc(d.petName)}'s groom is coming up.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid #F1DEDA;border-bottom:1px solid #F1DEDA;margin:4px 0 16px;">${rows}</table>
    ${d.depositLabel ? `<p style="margin:0 0 12px;font-size:13px;color:#7A3B36;background:#FBEEEB;border-radius:10px;padding:10px 12px;">${esc(d.depositLabel)}</p>` : ""}
    <p style="margin:0;font-size:14px;line-height:1.6;color:#8A7470;">Need to change or cancel? Just reply to this email and we'll sort it.</p>`;
  return {
    subject: `Reminder: ${d.petName}'s groom ${d.whenLabel}`,
    html: shell(d.businessName, `${d.petName}'s groom is ${d.whenLabel}`, body, d.logoUrl),
  };
}

/** Confirmation sent the moment a client books online. */
export function bookingConfirmationEmail(d: GroomEmailData): { subject: string; html: string } {
  const rows = [
    detailRow("Groom", d.serviceName),
    d.addons && d.addons.length ? detailRow("Extras", d.addons.join(", ")) : "",
    detailRow("When", d.whenLabel),
    detailRow("Dog", d.petName),
    d.address ? detailRow("Where", d.address) : "",
  ].join("");
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8A7470;">Thanks ${esc(d.firstName)}! We've sent your request to ${esc(d.businessName)} — they'll confirm shortly.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid #F1DEDA;border-bottom:1px solid #F1DEDA;margin:4px 0 16px;">${rows}</table>
    ${d.depositLabel ? `<p style="margin:0 0 12px;font-size:13px;color:#7A3B36;background:#FBEEEB;border-radius:10px;padding:10px 12px;">${esc(d.depositLabel)}</p>` : ""}
    <p style="margin:0;font-size:14px;line-height:1.6;color:#8A7470;">Need to change anything? Just reply to this email.</p>`;
  return {
    subject: `Booking received — ${d.petName}'s groom with ${d.businessName}`,
    html: shell(d.businessName, "Booking request received", body, d.logoUrl),
  };
}

/** Deposit payment link sent to a phone-booked client to secure their slot. */
export function depositLinkEmail(d: {
  businessName: string;
  firstName: string;
  petName: string;
  serviceName: string;
  whenLabel: string;
  amount: number;
  url: string;
  logoUrl?: string;
}): { subject: string; html: string } {
  const rows = [
    detailRow("Groom", d.serviceName),
    detailRow("When", d.whenLabel),
    detailRow("Dog", d.petName),
    detailRow("Deposit", `£${d.amount}`),
  ].join("");
  const cta = `<a href="${d.url}" style="display:inline-block;background:#C9756B;color:#FCF6F4;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:12px;">Pay your £${d.amount} deposit &rarr;</a>`;
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8A7470;">Hi ${esc(d.firstName)}, ${esc(d.petName)}'s groom with ${esc(d.businessName)} is booked in. To secure the slot, please pay your deposit — it comes off your total on the day.</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid #F1DEDA;border-bottom:1px solid #F1DEDA;margin:4px 0 20px;">${rows}</table>
    <div style="text-align:center;margin:0 0 8px;">${cta}</div>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#B3A39E;">Or paste this link into your browser:<br><a href="${d.url}" style="color:#C9756B;">${esc(d.url)}</a></p>`;
  return {
    subject: `${d.petName}'s groom is booked — pay your £${d.amount} deposit`,
    html: shell(d.businessName, `${d.petName}'s groom is booked`, body, d.logoUrl),
  };
}

/** A gentle "you're due a groom" nudge sent from the retention screen. */
export function rebookingReminderEmail(d: {
  businessName: string;
  firstName: string;
  petName: string;
  weeksSince: number;
  bookingUrl?: string;
}): { subject: string; html: string } {
  const cta = d.bookingUrl
    ? `<a href="${d.bookingUrl}" style="display:inline-block;background:#C9756B;color:#FCF6F4;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px;">Book ${esc(d.petName)}'s next groom</a>`
    : "";
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8A7470;">Hi ${esc(d.firstName)}, it's been about ${d.weeksSince} weeks since ${esc(d.petName)}'s last groom — shall we get the next one booked in?</p>
    ${cta}
    <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#8A7470;">Or just reply to this email and we'll find a time that suits you.</p>`;
  return {
    subject: `Time for ${d.petName}'s next groom?`,
    html: shell(d.businessName, `${d.petName} is due a groom`, body),
  };
}

/** Security notice sent to a user after their password is changed. */
export function passwordChangedEmail(d: {
  whenLabel: string;
  contactEmail?: string;
}): { subject: string; html: string } {
  const contact = d.contactEmail
    ? `<a href="mailto:${esc(d.contactEmail)}" style="color:#C9756B;">${esc(d.contactEmail)}</a>`
    : "us straight away";
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8A7470;">Your GroomOS password was just changed (${esc(d.whenLabel)}).</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#8A7470;">If this was you, you can ignore this email — you're all set.</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#7A3B36;background:#FBEEEB;border-radius:10px;padding:12px 14px;"><strong>If this wasn't you</strong>, please contact ${contact} so we can secure your account.</p>`;
  return {
    subject: "Your GroomOS password was changed",
    html: shell("GroomOS", "Password changed", body),
  };
}

/** Invite sent to a groomer to claim a pre-configured account and set their password. */
export function inviteEmail(d: {
  businessName: string;
  inviteUrl: string;
  expiresLabel: string;
  fromName?: string;
}): { subject: string; html: string } {
  const cta = `<a href="${d.inviteUrl}" style="display:inline-block;background:#C9756B;color:#FCF6F4;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:12px;">Set your password &amp; get started &rarr;</a>`;
  const intro = d.fromName
    ? `${esc(d.fromName)} has set up a GroomOS account for ${esc(d.businessName)} and invited you to take it over.`
    : `A GroomOS account has been set up for ${esc(d.businessName)} and you've been invited to take it over.`;
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8A7470;">${intro}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#8A7470;">Your services, prices and settings are already in place — just set your password and you're live. <strong>You choose your own password; no one else ever sees it.</strong></p>
    <div style="text-align:center;margin:0 0 8px;">${cta}</div>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#B3A39E;">This link expires ${esc(d.expiresLabel)} and can only be used once. Or paste it into your browser:<br><a href="${d.inviteUrl}" style="color:#C9756B;word-break:break-all;">${esc(d.inviteUrl)}</a></p>`;
  return {
    subject: `You're invited to GroomOS — set up ${d.businessName}`,
    html: shell("GroomOS", `Welcome to GroomOS`, body),
  };
}
