import { clerkMiddleware } from "@clerk/nextjs/server"

// Clerk session proxy (Next.js 16 renamed the `middleware` convention to
// `proxy`). Routes stay public by default — the app gates access client-side
// in app/page.tsx (<Gate>), so we don't call auth.protect() here. This keeps
// the Clerk session in sync and, critically, intercepts the production
// handshake at /__clerk/* (otherwise it 404s).
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next internals and static assets, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
    // Always run on Clerk's frontend-API handshake routes (production).
    "/__clerk/(.*)",
  ],
}
