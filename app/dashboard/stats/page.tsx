import FamilyStats from "@/components/FamilyStats";
import { getSupabase } from "@/utils/supabase/queries";
import { Person } from "@/types";

export const metadata = {
  title: "Thống kê gia phả",
};

export default async function StatsPage() {
  const supabase = await getSupabase();

  const { data: personsData } = await supabase
    .from("persons")
    .select(
      "id, gender, birth_year, birth_month, birth_day, death_year, is_deceased, is_in_law, generation, birth_order, birth_lunar_year, birth_lunar_month, birth_lunar_day",
    );
  const persons = (personsData || []) as Person[];
  const { data: relationships } = await supabase
    .from("relationships")
    .select("*");

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h1 className="title">Thống kê gia phả</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tổng quan số liệu về các thành viên trong dòng họ
        </p>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <FamilyStats
          persons={persons ?? []}
          relationships={relationships ?? []}
        />
      </main>
    </div>
  );
}
