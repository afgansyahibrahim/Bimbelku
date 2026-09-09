import MarketplaceMessages from "@/components/MarketplaceMessages";
import TeacherLayout from "@/components/TeacherLayout";

export default function TeacherMessages() {
  return (
    <TeacherLayout title="Pesan" lockContentScroll>
      <MarketplaceMessages role="teacher" />
    </TeacherLayout>
  );
}
