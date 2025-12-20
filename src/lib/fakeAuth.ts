export type LecturerUser = {
  email: string;
  firstName?: string;
  lastName?: string;
};

const STORAGE_KEY = "gamorax_lecturer";

export function fakeLogin(email: string, password: string) {
  // very simple mock validation
  if (!email || !password) {
    throw new Error("Email and password required");
  }

  const user: LecturerUser = { email };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function fakeRegister(user: LecturerUser & { password: string }) {
  if (!user.email || !user.password) {
    throw new Error("Missing fields");
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })
  );

  return user;
}

export function getCurrentLecturer() {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export function fakeLogout() {
  localStorage.removeItem(STORAGE_KEY);
}
