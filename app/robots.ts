import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/opengraph-image", "/twitter-image", "/manifest.webmanifest"],
    },
    sitemap: "https://kuzhiyundo.com/sitemap.xml",
  };
}
