import ContributionReview from "@/components/ContributionReview";
import PushSubscribeToggle from "@/components/PushSubscribeToggle";
import { getPendingContributions } from "@/app/actions/contribution";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { Person } from "@/types";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Duyệt đề xuất gia phả",
};

export default async function ContributionsPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await getSupabase();

  const [contributions, { data: personsData }] = await Promise.all([
    getPendingContributions(),
    supabase.from("persons").select("*"),
  ]);

  const persons = (personsData as Person[]) ?? [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-4xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="title">Duyệt đề xuất</h1>
            <p className="text-stone-500 mt-2 text-sm">
              Đề xuất bổ sung / sửa thông tin gia phả từ người thân gửi qua link đóng góp.
            </p>
          </div>
          <PushSubscribeToggle />
        </div>

        <ContributionReview
          contributions={contributions}
          persons={persons}
        />
      </div>
    </main>
  );
}
