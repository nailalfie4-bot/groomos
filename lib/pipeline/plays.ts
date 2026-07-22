/**
 * Founder Pipeline Tracker — the "Plays" tab content (scripts & reference).
 *
 * EVERYTHING the Plays tab shows lives in this one file so the founder can edit
 * wording without touching components. The text below is a working DRAFT that
 * follows the ladder methodology — overwrite any string with your exact wording.
 * Handy tokens you can leave in and swap by hand: {handle}, {name}.
 */

export interface CopyBlock {
  /** Short label shown above the copyable text. */
  label: string;
  /** The text copied to the clipboard when tapped. */
  text: string;
}

/** The 5-rung ladder — the spine of every conversation. Never skip a rung. */
export const LADDER: { rungs: { name: string; hint: string }[]; rule: string } = {
  rungs: [
    { name: "Warm", hint: "React + genuinely admire their work first. No pitch." },
    { name: "Open", hint: "One soft opener that invites a reply." },
    { name: "Dig", hint: "Ask about their admin/time — let them name the pain." },
    { name: "Reveal", hint: "Mirror their pain back with the fix. Then stop typing." },
    { name: "Close", hint: "Offer the 10-min call / free setup once they're warm." },
  ],
  rule: "Never skip a rung. After the Reveal, stop typing — let them come to you.",
};

/** 5 openers — soft, specific, easy to reply to. */
export const OPENERS: CopyBlock[] = [
  { label: "Opener 1 · admire", text: "Love {handle}'s grid 🐾 how long have you been grooming?" },
  { label: "Opener 2 · capacity", text: "Your before/afters are gorgeous — are you fully booked or still taking new dogs?" },
  { label: "Opener 3 · solo?", text: "That transformation is unreal 😍 do you run the whole place solo?" },
  { label: "Opener 4 · local", text: "Been admiring your work! Are you Manchester-based? Trying to connect with local groomers." },
  { label: "Opener 5 · bookings", text: "Genuinely impressed by your grid. Quick one — how are you handling bookings at the minute?" },
];

/** 3 dig questions — get them to name the time-sink. */
export const DIG_QUESTIONS: CopyBlock[] = [
  { label: "Dig 1 · system", text: "How are you keeping on top of bookings right now — DMs, a diary, an app?" },
  { label: "Dig 2 · time-sink", text: "What's the bit of the day that eats the most time outside of actually grooming?" },
  { label: "Dig 3 · magic wand", text: "If you could wave a wand and fix one admin headache, what would it be?" },
];

/** 6 reveals — pick the one that matches the signal they gave you. */
export const REVEALS: CopyBlock[] = [
  { label: "Reveal · diary", text: "The diary works until it doesn't — one no-show or double-book and the day's gone. Most groomers I speak to move to something that texts reminders and stops clashes automatically." },
  { label: "Reveal · chaos", text: "That back-and-forth in the DMs is the silent killer — it's where slots go missing. Worth having one place that takes the booking, the deposit and the reminder off your plate." },
  { label: "Reveal · general", text: "Honestly most groomers don't want 'software' — they want their evenings back. The right setup just does the admin so you can groom." },
  { label: "Reveal · no-shows", text: "No-shows are the one that stings — you've held the slot and lost the money. A small deposit at booking quietly fixes it." },
  { label: "Reveal · cleaning", text: "When cleaning's the biggest time-sink, the win isn't more hours — it's cutting the admin around it so the day flows: bookings, reminders and rebooking on autopilot." },
  { label: "Reveal · social media", text: "You clearly get the content side — imagine the booking link doing the selling while you post. Every before/after becomes a booking." },
];

/** The close — one clear, low-pressure ask. */
export const CLOSE: CopyBlock = {
  label: "The close",
  text: "Genuinely think GroomOS could save you a few hours a week. Fancy a quick 10-min call this week so I can show you? No pressure — and I'll set it all up free if it's a fit.",
};

/** 6 objection handlers. */
export const OBJECTIONS: CopyBlock[] = [
  { label: "“I like control”", text: "Totally — you stay in full control. You choose which dogs, coats and behaviours you take; it just handles the admin around your rules." },
  { label: "“I'm too small”", text: "Honestly it's built for solo groomers — the smaller you are, the more the time back matters. No team needed." },
  { label: "“Too expensive”", text: "Get it — it's less than one groom a month, and it pays for itself the first no-show it stops. Want me to show you the numbers?" },
  { label: "“I use Booksy”", text: "Fair — a lot of people come from Booksy. The difference: this is built for dog grooming specifically (coats, matting, deposits) and you're not competing in a marketplace. Worth a side-by-side?" },
  { label: "“I'll think about it”", text: "Of course — no rush. Want me to set up a free trial so you can think about it with it actually running, not just in your head?" },
  { label: "“Not right now”", text: "Completely understand. Can I check back in a few weeks? I'll get everything set up free so when you're ready it's just switch-on." },
];

/** Daily rhythm — morning prospecting, afternoon outreach, evening close-and-log. */
export const CHECKLIST: { period: string; items: string[] }[] = [
  {
    period: "Morning · prospecting",
    items: [
      "Find 20 new local groomers",
      "Save their handles to the pipeline",
      "Note a signal for each (diary / chaos / control…)",
    ],
  },
  {
    period: "Afternoon · outreach",
    items: [
      "Send 20 openers",
      "Reply to every response within the hour",
      "Move each reply up one rung — never skip",
    ],
  },
  {
    period: "Evening · close & log",
    items: [
      "Send today's reveals + closes",
      "Book any calls that are ready",
      "Log the numbers (openers / replies / calls / trials / paid)",
      "Set tomorrow's next action on every warm lead",
    ],
  },
];
