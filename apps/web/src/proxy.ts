import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { routes } from '@/lib/routes';

const isProtectedRoute = createRouteMatcher(['/app(.*)', '/organization(.*)']);

export default clerkMiddleware(
  async (auth, req) => {
    if (req.nextUrl.pathname === routes.app) {
      return NextResponse.redirect(new URL(routes.overview, req.url));
    }

    if (isProtectedRoute(req)) {
      const { isAuthenticated, redirectToSignIn } = await auth({
        treatPendingAsSignedOut: false
      });

      if (!isAuthenticated) {
        return redirectToSignIn();
      }
    }
  },
  {
    signInUrl: routes.signIn,
    signUpUrl: routes.signIn
  }
);

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
