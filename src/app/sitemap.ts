import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://gamorax.app";
  const routes = ["", "/about", "/contact", "/privacy"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
  return routes;
}