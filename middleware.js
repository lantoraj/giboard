import { next } from "@vercel/edge";

/**
 * Vercel Edge Middleware – HTTP Basic Auth for the whole site.
 *
 * Credentials come from two environment variables set in the Vercel
 * dashboard (Settings → Environment Variables, Production scope):
 *   BASIC_AUTH_USER
 *   BASIC_AUTH_PASSWORD
 *
 * Fail-open: if the variables are NOT set, the site stays public.
 * This avoids locking everyone out before the credentials are configured.
 */
export const config = {
  // run on everything (assets included – the browser re-sends the header)
  matcher: "/(.*)",
};

export default function middleware(request) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // Not configured yet → site stays public
  if (!user || !pass) return next();

  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const sep = decoded.indexOf(":");
        const u = decoded.slice(0, sep);
        const p = decoded.slice(sep + 1);
        if (u === user && p === pass) return next();
      } catch {
        // malformed header → fall through to 401
      }
    }
  }

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="GI-Board", charset="UTF-8"' },
  });
}
