import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

function redirectToHome(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.delete("next");
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // -----------------------------
  // 1) Public routes (no auth)
  // -----------------------------
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||         // lecturer login page
    pathname.startsWith("/auth/login") ||    // student login page
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||          // allow other auth pages
    pathname.startsWith("/api") ||
    pathname.startsWith("/health");

  if (isPublic) return response;

  // -----------------------------
  // 2) Define protected areas
  // -----------------------------
  const isStudentArea = pathname.startsWith("/me") || pathname.startsWith("/join");
  const isLecturerArea = pathname.startsWith("/course") || pathname.startsWith("/lecturer");

  // If neither, do nothing (or lock down everything by removing this)
  if (!isStudentArea && !isLecturerArea) return response;

  // -----------------------------
  // 3) Require login (redirect to correct login page)
  // -----------------------------
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    // ✅ different login pages
    if (isStudentArea) return redirectTo(request, "/auth/login");
    if (isLecturerArea) return redirectTo(request, "/login");
    return redirectTo(request, "/login");
  }

  // -----------------------------
  // 4) Require correct role
  // -----------------------------
  const { data: prof, error } = await supabase
    .from("my_profile_api")
    .select("role")
    .single();

  if (error || !prof?.role) {
    return redirectToHome(request);
  }

  const role = String(prof.role);

  if (isLecturerArea && role !== "lecturer") {
    return redirectToHome(request);
  }

  if (isStudentArea && role !== "student") {
    return redirectToHome(request);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
