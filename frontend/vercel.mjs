const apiOrigin = process.env.NOVIO_API_ORIGIN;
if (process.env.VERCEL_ENV === "production" && !apiOrigin) {
  throw new Error("Set NOVIO_API_ORIGIN to the AWS HTTPS origin in the Vercel production environment.");
}

if (apiOrigin) {
  const url = new URL(apiOrigin);
  if (url.protocol !== "https:" || url.origin !== apiOrigin) {
    throw new Error("NOVIO_API_ORIGIN must be an HTTPS origin without a path or trailing slash.");
  }
}

// Keep the API and SPA fallbacks separate. A preview without a backend returns
// an explicit unavailable response and can still display public SPA routes.
export const config = {
  framework: "vite",
  routes: [
    apiOrigin
      ? { src: "/api(/.*)?", dest: apiOrigin + "/api$1" }
      : { src: "/api(/.*)?", status: 503 },
    { handle: "filesystem" },
    { src: "/.*", dest: "/index.html" },
  ],
};
