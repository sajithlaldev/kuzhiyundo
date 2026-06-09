import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/report/"],
      disallow: ["/api/", "/opengraph-image", "/twitter-image"],
    },
    sitemap: "https://kuzhiyundo.com/sitemap.xml",
  };
}
