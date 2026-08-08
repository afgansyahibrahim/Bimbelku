import StudentLayout from "@/components/StudentLayout";
import NotificationCenter from "@/components/NotificationCenter";

export default function StudentNotifications() {
  return (
    <StudentLayout title="Notifikasi">
      <NotificationCenter role="student" />
    </StudentLayout>
  );
}
