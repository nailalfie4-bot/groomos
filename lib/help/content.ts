/**
 * In-app help — short, plain-English answers for a non-technical groomer on a
 * phone. Every answer is under 100 words, no jargon. Used by the searchable Help
 * in Settings and the per-page "?" button (via `pages`).
 */
export interface HelpEntry {
  id: string;
  question: string;
  answer: string;
  /** Page paths this answer is most relevant to (drives the per-page "?"). */
  pages: string[];
}

export const HELP: HelpEntry[] = [
  {
    id: "services",
    question: "How do I add my services and prices?",
    answer:
      "Go to Services from the menu, then tap “Add service”. Give it a name (like Full Groom), set the price and how long it takes, and save. Add as many as you like. You can also add extras such as a nail trim that clients can tick on when they book. Change a price any time — it only affects new bookings, never ones already made.",
    pages: ["/services"],
  },
  {
    id: "clients",
    question: "How do I add clients and their dogs?",
    answer:
      "Open Clients and tap “Add client”. Enter their name, phone and email, then add their dog’s name and breed. You can add several dogs to one owner. Clients who book online are added for you automatically, so your list fills up on its own over time. Tap any client to see their dogs, notes and past grooms.",
    pages: ["/clients"],
  },
  {
    id: "booking-link",
    question: "How do I share my booking link?",
    answer:
      "In Settings, under Business details, you’ll see your booking link with a Copy button. Paste it into your Instagram bio, Facebook page, or a text to a client. When they open it they can book themselves in. Tip: pin it to your social profiles so new clients can always find it.",
    pages: ["/settings", "/dashboard"],
  },
  {
    id: "pending",
    question: "What does “pending” mean and how do I confirm a booking?",
    answer:
      "A pending booking is a client request you haven’t accepted yet — nothing’s locked in until you confirm it. You’ll get an email and see a “to confirm” badge on your Dashboard and Appointments. Open the booking and tap Confirm (or Cancel). Prefer it automatic? In Settings turn on “Auto-confirm online bookings” and they’ll confirm themselves.",
    pages: ["/appointments", "/dashboard"],
  },
  {
    id: "deposits",
    question: "How do I take a deposit?",
    answer:
      "In Settings, under Deposits, switch deposits on and set the amount. To take the money by card you’ll connect Stripe (a tap-through setup) — then clients pay when they book. Without Stripe, deposits are “recorded” only: agreed but collected by you in person. You can also set a different deposit on a single service.",
    pages: ["/settings"],
  },
  {
    id: "time-off",
    question: "How do I block time off or set my closed days?",
    answer:
      "On the Calendar, tap “Time off” to block a holiday, a single day, or a few hours — clients can’t book then. For days you’re always shut (say Sundays), go to Settings → Regular closed days and tap those days. Both show as closed on your calendar and your booking page automatically.",
    pages: ["/calendar"],
  },
  {
    id: "booking-window",
    question: "How far ahead can clients book, and how do I change it?",
    answer:
      "By default clients can book up to 3 months ahead. To change it, go to Settings → “How far ahead clients can book” and pick 1, 2, 3, 6 or 12 months. Their booking calendar then lets them move forward month by month up to your limit. Days you’re closed or fully booked show as unavailable.",
    pages: ["/settings"],
  },
  {
    id: "client-view",
    question: "What does a client see when they book?",
    answer:
      "They open your link, pick a service, choose a day and time from a calendar (only your free slots show), enter their and their dog’s details, agree to anything you’ve set, and pay a deposit if you take one. They get a confirmation email, and you get one too. Tap your booking link to try it yourself.",
    pages: ["/dashboard", "/settings"],
  },
  {
    id: "posts",
    question: "Where are my before/after posts and captions?",
    answer:
      "When you mark a groom complete you can add before and after photos to a card. Open that finished booking (from the Calendar or Appointments) and tap “Create a social post” — GroomOS lays out the photos and writes a caption you can copy straight to Instagram or Facebook.",
    pages: ["/appointments", "/calendar"],
  },
  {
    id: "reminders",
    question: "How do I remind clients about their appointment?",
    answer:
      "Open “Send reminders” to see tomorrow’s bookings with a WhatsApp button by each — tap it to open WhatsApp with the message ready, then send. For dogs overdue a groom, use “Due for a groom”. You can edit the wording in Settings → WhatsApp messages. Nothing sends automatically — you always press send.",
    pages: ["/reminders", "/retention"],
  },
];

/** The most relevant answers for a page (for the per-page "?"). */
export function helpForPage(path: string, max = 3): HelpEntry[] {
  return HELP.filter((h) => h.pages.includes(path)).slice(0, max);
}

/** Search across questions + answers (case-insensitive, all terms must match). */
export function searchHelp(query: string): HelpEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return HELP;
  return HELP.filter((h) => {
    const hay = `${h.question} ${h.answer}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
