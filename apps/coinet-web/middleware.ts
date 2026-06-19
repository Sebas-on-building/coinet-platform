import { clerkMiddleware } from "@clerk/nextjs/server"

// Clerk session middleware. Routes stay public by default — the app gates
// access client-side in app/page.tsx (<Gate>), so we don't call auth.protect()
// here. This middleware just keeps the Clerk session in sync on every request.
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next internals and static assets, but run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ico|webp|avif|woff2?|ttf|otf|map)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
}
