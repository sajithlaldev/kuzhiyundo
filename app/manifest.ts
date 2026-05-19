import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kuzhiyundo? | Community Pothole Tracker for Kerala",
    short_name: "Kuzhiyundo",
    description: "Community-driven pothole tracking map. Report and avoid kuzhis (potholes) in Kerala.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#00f0ff",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["navigation", "utilities", "travel"],
    lang: "en-IN",
  };
}
