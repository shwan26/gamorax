import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ✅ Public lecturer pages (no auth)
  const isPublicLecturer =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  // If it's a public page, we still may want to redirect logged-in lecturers away from /login
  if (isPublicLecturer) {
    // only for /login (keep register/forgot open)
    if (pathname !== "/login") return NextResponse.next();

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          }
        },
      }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return response;

    const { data: prof } = await supabase.from("my_profile_api").select("role").single();

    if (prof?.role === "lecturer") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return response;
  }

  // ✅ Lecturer-protected area
  const isLecturerArea =
    pathname === "/dashboard" ||
    pathname.startsWith("/course");

  // If not a lecturer route, don't block here
  if (!isLecturerArea) return NextResponse.next();

  // We need a response object to attach refreshed cookies
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }

      },
    }
  );

  // ✅ Must be logged in
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return redirectTo(request, "/login");
  }

  // ✅ Must have lecturer role
  const { data: prof, error } = await supabase
    .from("my_profile_api")
    .select("role")
    .single();

  if (error || prof?.role !== "lecturer") {
    // you can also signOut here if you want, but proxy is server-side
    return redirectTo(request, "/login");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
