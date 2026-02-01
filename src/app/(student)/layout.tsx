import RoleGuard from "@/src/components/RoleGuard";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard requiredRole="student">{children}</RoleGuard>;
}
