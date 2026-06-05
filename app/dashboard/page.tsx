import { getTodayLunar } from "@/utils/dateHelpers";
import { computeEvents } from "@/utils/eventHelpers";
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import {
  ArrowRight,
  BarChart2,
  Cake,
  CalendarDays,
  Database,
  Flower2,
  GitMerge,
  Network,
  Star,
  Users,
  Image as ImageIcon,
  Share2,
} from "lucide-react";
import Link from "next/link";

const eventTypeConfig = {
  birthday: {
    icon: Cake,
    label: "Sinh nhật",
    color: "text-emerald-600",
    bg: "bg-emerald-50/70",
  },
  death_anniversary: {
    icon: Flower2,
    label: "Ngày giỗ",
    color: "text-purple-600",
    bg: "bg-purple-50/70",
  },
  custom_event: {
    icon: Star,
    label: "Sự kiện",
    color: "text-amber-600",
    bg: "bg-amber-50/70",
  },
};

export default async function DashboardLaunchpad() {
  const isAdmin = await getIsAdmin();
  const supabase = await getSupabase();

  /* ── Fetch events & person stats data ──────────────────────────────── */
  const [{ data: persons }, { data: customEvents }] = await Promise.all([
    supabase
      .from("persons")
      .select(
        "id, full_name, gender, generation, is_in_law, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, birth_lunar_year, birth_lunar_month, birth_lunar_day, legal_birth_year, legal_birth_month, legal_birth_day, birthday_remind_type",
      ),
    supabase
      .from("custom_events")
      .select("id, name, content, event_date, location, created_by"),
  ]);

  const allEvents = computeEvents(persons ?? [], customEvents ?? []);
  const upcomingEvents = allEvents.filter(
    (e) => e.daysUntil >= 0 && e.daysUntil <= 30,
  );

  const lunar = getTodayLunar();

  // Local VN timezone calculation for Date Display
  const today = new Date();
  const vnTimeStr = today.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnDate = new Date(vnTimeStr);
  const solarDay = vnDate.getDate().toString().padStart(2, "0");
  const solarMonthStr = `Tháng ${vnDate.getMonth() + 1}, ${vnDate.getFullYear()}`;
  const dayOfWeekStr = vnDate.toLocaleDateString("vi-VN", { weekday: "long" });

  /* ── Feature lists ────────────────────────────────────────────── */
  const publicFeatures = [
    {
      title: "Cây gia phả",
      description: "Xem và tương tác với sơ đồ dòng họ",
      icon: <Network className="size-8 text-amber-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/members",
      bgColor: "bg-amber-50/70",
      borderColor: "border-amber-200/50",
      hoverColor: "hover:border-amber-400 hover:shadow-soft-hover hover:-translate-y-1",
    },
    {
      title: "Phòng trưng bày",
      description: "Lưu giữ và chia sẻ hình ảnh, kỷ niệm dòng họ",
      icon: <ImageIcon className="size-8 text-pink-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/gallery",
      bgColor: "bg-pink-50/70",
      borderColor: "border-pink-200/50",
      hoverColor: "hover:border-pink-400 hover:shadow-soft-hover hover:-translate-y-1",
    },
    {
      title: "Tra cứu danh xưng",
      description: "Hệ thống gọi tên họ hàng chuẩn xác",
      icon: <GitMerge className="size-8 text-blue-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/kinship",
      bgColor: "bg-blue-50/70",
      borderColor: "border-blue-200/50",
      hoverColor: "hover:border-blue-400 hover:shadow-soft-hover hover:-translate-y-1",
    },
    {
      title: "Thống kê gia phả",
      description: "Tổng quan dữ liệu và biểu đồ phân tích",
      icon: <BarChart2 className="size-8 text-purple-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/stats",
      bgColor: "bg-purple-50/70",
      borderColor: "border-purple-200/50",
      hoverColor: "hover:border-purple-400 hover:shadow-soft-hover hover:-translate-y-1",
    },
  ];

  const adminFeatures = [
    {
      title: "Quản lý Người dùng",
      description: "Phê duyệt tài khoản và phân quyền",
      icon: <Users className="size-8 text-rose-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/users",
      bgColor: "bg-rose-50/70",
      borderColor: "border-rose-200/50",
      hoverColor: "hover:border-rose-400 hover:shadow-soft-hover hover:-translate-y-1",
    },
    {
      title: "Liên kết Chia sẻ",
      description: "Quản lý các đường link xem gia phả công khai",
      icon: <Share2 className="size-8 text-amber-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/sharing",
      bgColor: "bg-amber-50/70",
      borderColor: "border-amber-200/50",
      hoverColor: "hover:border-amber-400 hover:shadow-soft-hover hover:-translate-y-1",
    },
    {
      title: "Thứ tự gia phả",
      description: "Sắp xếp và xem cấu trúc hệ thống",
      icon: <Network className="size-8 text-indigo-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/lineage",
      bgColor: "bg-indigo-50/70",
      borderColor: "border-indigo-200/50",
      hoverColor: "hover:border-indigo-400 hover:shadow-soft-hover hover:-translate-y-1",
    },
    {
      title: "Sao lưu & Phục hồi",
      description: "Xuất/Nhập dữ liệu toàn hệ thống",
      icon: <Database className="size-8 text-teal-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/data",
      bgColor: "bg-teal-50/70",
      borderColor: "border-teal-200/50",
      hoverColor: "hover:border-teal-400 hover:shadow-soft-hover hover:-translate-y-1",
    },
  ];

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Welcome Hero Section with Animated Border */}
      <div className="relative p-[1.5px] overflow-hidden rounded-[2rem] shadow-soft mb-8 group/hero animate-in fade-in slide-in-from-top-4 duration-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-500">
        {/* Animated gradient spinning border */}
        <div
          className="absolute top-1/2 left-1/2 w-[150%] aspect-square animate-border-rotate will-change-transform opacity-40 group-hover/hero:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            backgroundImage: "conic-gradient(from 0deg, transparent 35%, #d97706, #fbbf24 50%, #d97706, transparent 65%)",
          }}
        ></div>

        {/* Inner container with solid background to block center light bleed */}
        <div className="relative z-10 overflow-hidden rounded-[calc(2rem-1.5px)] bg-gradient-to-br from-amber-50 via-white to-stone-100 p-8 sm:p-10 border border-stone-200/30">
          {/* Subtle decorative background shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50 group-hover/hero:scale-105 transition-transform duration-700"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-stone-100/80 rounded-full blur-2xl pointer-events-none group-hover/hero:scale-105 transition-transform duration-700"></div>

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/60 border border-amber-200/60 text-xs font-bold text-amber-800 uppercase tracking-wider">
                ✨ Gia Phả Online
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
                Nơi Lưu Giữ Di Sản Gia Đình
              </h1>
              <p className="text-stone-600 text-sm sm:text-base font-medium leading-relaxed">
                Chào mừng bạn đến với hệ thống gia phả trực tuyến. Nơi lưu giữ nguồn cội, tôn vinh tổ tiên và kết nối tình thân bền chặt giữa các thế hệ.
              </p>
            </div>

            {/* Quick stats & action buttons */}
            <div className="flex flex-wrap gap-4 shrink-0 w-full xl:w-auto">
              {/* Quick Link to Family Tree (Green Themed) */}
              <Link
                href="/dashboard/members"
                className="flex items-center gap-4 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl p-5 shadow-xs hover:border-emerald-400 hover:shadow-soft hover:bg-emerald-50/90 transition-all duration-300 flex-1 sm:flex-initial min-w-[200px] group/tree"
              >
                <div className="size-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white group-hover/tree:scale-105 transition-transform duration-300">
                  <Network className="size-6" />
                </div>
                <div>
                  <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block flex items-center gap-1">
                    Cây gia phả
                    <ArrowRight className="size-3 group-hover/tree:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-sm font-bold text-stone-850 mt-1 block">Xem sơ đồ cây</span>
                  <span className="text-[10px] text-stone-500 font-medium block">Tương tác trực quan</span>
                </div>
              </Link>

              {/* Quick Link to Gallery (Amber Themed) */}
              <Link
                href="/dashboard/gallery"
                className="flex items-center gap-4 bg-amber-50/80 border border-amber-200/60 rounded-2xl p-5 shadow-xs hover:border-amber-400 hover:shadow-soft hover:bg-amber-50/90 transition-all duration-300 flex-1 sm:flex-initial min-w-[200px] group/gallery"
              >
                <div className="size-12 rounded-xl bg-amber-600 flex items-center justify-center text-white group-hover/gallery:scale-105 transition-transform duration-300">
                  <ImageIcon className="size-6" />
                </div>
                <div>
                  <span className="text-xs text-amber-800 font-bold uppercase tracking-wider block flex items-center gap-1">
                    Phòng trưng bày
                    <ArrowRight className="size-3 group-hover/gallery:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-sm font-bold text-stone-850 mt-1 block">Hình ảnh dòng họ</span>
                  <span className="text-[10px] text-stone-500 font-medium block">Lưu giữ khoảnh khắc</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar & Events Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Left: Lunar/Solar Calendar Widget */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-stone-200/60 shadow-soft p-6 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 hover:shadow-soft-hover hover:border-amber-300/80 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-3 py-1 rounded-full uppercase tracking-wider">
                Lịch Âm Dương
              </span>
              <CalendarDays className="size-5 text-stone-400 group-hover:scale-110 group-hover:text-amber-700 transition-all duration-300" />
            </div>

            {/* Date Details */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="size-12 rounded-2xl bg-amber-50/70 border border-amber-100/50 flex items-center justify-center text-amber-700 shadow-xs group-hover:scale-105 transition-all duration-300">
                <CalendarDays className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest leading-none">
                  {dayOfWeekStr}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 tracking-tight mt-2.5 leading-snug">
                  Ngày {solarDay} {solarMonthStr}
                </h3>
              </div>
            </div>
          </div>

          {/* Lunar Section below */}
          <div className="pt-5 mt-5 border-t border-stone-100 space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 shadow-xs">
              <span className="text-xs font-bold">🌿</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Âm lịch</span>
            </div>
            <div className="pl-1.5">
              <p className="text-base font-extrabold text-stone-900 group-hover:text-amber-900 transition-colors duration-300">
                Ngày {lunar.lunarDayStr} tháng {lunar.lunarMonth}
              </p>
              <p className="text-xs text-stone-500 font-semibold mt-1">
                Năm {lunar.lunarYear}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Upcoming Events Widget */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200/60 shadow-soft p-6 flex flex-col justify-between group/events hover:-translate-y-1 hover:shadow-soft-hover hover:border-amber-300/80 transition-all duration-300">
          <div className="w-full">
            <div className="flex items-center justify-between mb-4.5">
              <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-550 bg-emerald-500"></span>
                </span>
                Sự kiện dòng tộc sắp tới ({upcomingEvents.length})
              </h3>
              <Link
                href="/dashboard/events"
                className="group/btn text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline transition-all"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="size-3 group-hover/btn:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {upcomingEvents.slice(0, 4).map((evt, i) => {
                  const cfg = eventTypeConfig[evt.type];
                  const Icon = cfg.icon;
                  return (
                    <Link
                      href="/dashboard/events"
                      key={i}
                      className="group/item flex items-center gap-3.5 p-3 rounded-2xl bg-stone-50/50 hover:bg-amber-50/60 border border-stone-100 hover:border-amber-200/50 transition-all duration-300"
                    >
                      <div
                        className={`size-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 shadow-xs border border-white group-hover/item:scale-105 transition-all`}
                      >
                        <Icon className={`size-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-stone-700 truncate block group-hover/item:text-stone-900">
                          {evt.personName}
                        </span>
                        <span className="text-xs text-stone-500 font-medium pt-0.5 block">
                          {evt.daysUntil === 0
                            ? "Hôm nay"
                            : evt.daysUntil === 1
                              ? "Ngày mai"
                              : `${evt.daysUntil} ngày nữa`}{" "}
                          · {evt.eventDateLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3 opacity-95">
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 text-stone-400">
                  <CalendarDays className="size-5" />
                </div>
                <p className="text-stone-500 text-sm font-medium">
                  Không có sự kiện gia đình nào trong 30 ngày tới.
                </p>
              </div>
            )}
          </div>

          {upcomingEvents.length > 4 && (
            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400 font-medium">
              <span>+ {upcomingEvents.length - 4} sự kiện khác...</span>
              <Link href="/dashboard/events" className="text-amber-700 font-bold hover:underline">
                Xem toàn bộ lịch trình
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="space-y-10">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Tính Năng Dòng Họ</span>
            <div className="h-px flex-1 bg-stone-200/80"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {publicFeatures.map((feat) => (
              <Link
                key={feat.href}
                href={feat.href}
                className="group flex flex-col p-6 rounded-3xl bg-white border border-stone-200/60 hover:border-amber-400/85 hover:shadow-soft-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`size-12 rounded-2xl flex items-center justify-center mb-5 ${feat.bgColor} transition-colors duration-300 group-hover:bg-white border border-transparent group-hover:${feat.borderColor}`}
                >
                  {feat.icon}
                </div>
                <h4 className="text-base font-bold text-stone-855 mb-1.5 group-hover:text-amber-700 transition-colors">
                  {feat.title}
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                  {feat.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-bold text-rose-800/80 uppercase tracking-widest">Tính Năng Quản Trị</span>
              <div className="h-px flex-1 bg-rose-200/50"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {adminFeatures.map((feat) => (
                <Link
                  key={feat.href}
                  href={feat.href}
                  className="group flex flex-col p-6 rounded-3xl bg-white border border-stone-200/60 hover:border-rose-400/85 hover:shadow-soft-hover hover:-translate-y-1 transition-all duration-300"
                >
                  <div
                    className={`size-12 rounded-2xl flex items-center justify-center mb-5 ${feat.bgColor} transition-colors duration-300 group-hover:bg-white border border-transparent group-hover:${feat.borderColor}`}
                  >
                    {feat.icon}
                  </div>
                  <h4 className="text-base font-bold text-stone-855 mb-1.5 group-hover:text-rose-700 transition-colors">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                    {feat.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
