import RoleGuard from "@/src/components/RoleGuard";

export default function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard requiredRole="lecturer">{children}</RoleGuard>;
}
