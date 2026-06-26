import type { MetadataRoute } from "next";

/**
 * Web app manifest — makes GroomOS installable. "Add to Home Screen" launches
 * it full-screen (no browser chrome) with the rose icon and a warm cream
 * splash, so a groomer can keep it on their phone like a native app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GroomOS — grooming, run simply",
    short_name: "GroomOS",
    description:
      "Run your whole grooming day from your phone — bookings, reminders and happy clients.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FCF6F4",
    theme_color: "#FCF6F4",
    categories: ["business", "productivity"],
    icons: [
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
