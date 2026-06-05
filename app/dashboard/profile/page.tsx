import ProfileForm from "@/components/ProfileForm";
import { Person } from "@/types";
import { getProfile, getSupabase, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [profile, supabase] = await Promise.all([
    getProfile(user.id),
    getSupabase(),
  ]);

  // Fetch all persons for the self-link selector
  const { data: personsData } = await supabase
    .from("persons")
    .select("id, full_name, gender, avatar_url, birth_year, is_deceased")
    .order("full_name");

  const persons = (personsData as Pick<
    Person,
    "id" | "full_name" | "gender" | "avatar_url" | "birth_year" | "is_deceased"
  >[]) || [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8">
      <div className="max-w-2xl mx-auto px-4 pb-12 sm:px-6 w-full">
        <div className="mb-8">
          <h1 className="title">Hồ sơ của tôi</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base">
            Cập nhật thông tin tài khoản và liên kết với thành viên trong gia phả.
          </p>
        </div>

        <ProfileForm
          userId={user.id}
          email={user.email ?? ""}
          currentAvatarUrl={profile?.avatar_url ?? null}
          currentPersonId={profile?.person_id ?? null}
          persons={persons as Person[]}
        />
      </div>
    </main>
  );
}
