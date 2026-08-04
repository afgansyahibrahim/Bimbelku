import MarketplaceMessages from "@/components/MarketplaceMessages";
import StudentLayout from "@/components/StudentLayout";

export default function Messages() {
  return (
    <StudentLayout title="Pesan">
      <MarketplaceMessages role="student" />
    </StudentLayout>
  );
}
