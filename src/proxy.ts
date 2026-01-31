import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

function redirectToStudentLogin(req: NextRequest) {
  return redirectTo(req, "/auth/login");
}

function redirectToLecturerLogin(req: NextRequest) {
  return redirectTo(req, "/login");
}

function redirectToHome(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.delete("next");
  return NextResponse.redirect(url);
}

function redirectToStudentHome(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/me";
  url.searchParams.delete("next");
  return NextResponse.redirect(url);
}

function redirectToLecturerHome(req: NextRequest) {
  // adjust if your lecturer landing page is different
  const url = req.nextUrl.clone();
  url.pathname = "/course";
  url.searchParams.delete("next");
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  // response we can attach refreshed cookies to
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update request cookies so downstream sees them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Update response cookies so browser stores them
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // -----------------------------
  // 0) Public routes (no auth)
  // -----------------------------
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/health") ||
    pathname.startsWith("/auth") ||     // includes /auth/login, callbacks, etc.
    pathname.startsWith("/login") ||    // lecturer login
    pathname.startsWith("/signup");     // if you have it

  if (isPublic) return response;

  // -----------------------------
  // 1) Areas
  // -----------------------------
  const isLecturerArea =
    pathname.startsWith("/course") ||
    pathname.startsWith("/lecturer");

  const isStudentArea =
    pathname.startsWith("/me") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/join") ||        // join by pin requires login
    pathname.startsWith("/assignment");    // assignment links require login

  // If it's not a protected area, just allow it (or change this to require auth globally)
  if (!isLecturerArea && !isStudentArea) return response;

  // -----------------------------
  // 2) Require login
  // -----------------------------
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return isStudentArea ? redirectToStudentLogin(request) : redirectToLecturerLogin(request);
  }

  // -----------------------------
  // 3) Load role + enforce
  // -----------------------------
  const { data: prof, error } = await supabase
    .from("my_profile_api")
    .select("role")
    .single();

  if (error || !prof?.role) {
    return redirectToHome(request);
  }

  const role = String(prof.role);

  // If user tries to access the wrong area:
  if (isLecturerArea && role !== "lecturer") {
    // if student, send them to /me; otherwise /
    return role === "student" ? redirectToStudentHome(request) : redirectToHome(request);
  }

  if (isStudentArea && role !== "student") {
    // if lecturer, send them to /course; otherwise /
    return role === "lecturer" ? redirectToLecturerHome(request) : redirectToHome(request);
  }

  return response;
}

// Run proxy on everything except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
