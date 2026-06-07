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
        "id, full_name, gender, generation, is_in_law, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, anniversary_lunar_year, anniversary_lunar_month, anniversary_lunar_day, is_deceased, birth_lunar_year, birth_lunar_month, birth_lunar_day, legal_birth_year, legal_birth_month, legal_birth_day, birthday_remind_type",
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
      icon: <Network className="size-6 text-amber-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/members",
      iconBg: "bg-gradient-to-br from-amber-50 to-amber-100/40 border-amber-100/60 group-hover:border-amber-300/60",
      hoverBorderColor: "hover:border-amber-400/80",
      hoverTextColor: "group-hover:text-amber-700",
      glowGradient: "from-amber-500/6 via-orange-500/3 to-transparent",
      arrowHoverClass: "group-hover:text-amber-700 group-hover:bg-amber-50/60 group-hover:border-amber-200/60",
    },
    {
      title: "Album ảnh",
      description: "Lưu giữ và chia sẻ hình ảnh, kỷ niệm dòng họ",
      icon: <ImageIcon className="size-6 text-pink-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/gallery",
      iconBg: "bg-gradient-to-br from-pink-50 to-pink-100/40 border-pink-100/60 group-hover:border-pink-300/60",
      hoverBorderColor: "hover:border-pink-400/80",
      hoverTextColor: "group-hover:text-pink-700",
      glowGradient: "from-pink-500/6 via-rose-500/3 to-transparent",
      arrowHoverClass: "group-hover:text-pink-700 group-hover:bg-pink-50/60 group-hover:border-pink-200/60",
    },
    {
      title: "Tra cứu danh xưng",
      description: "Hệ thống gọi tên họ hàng chuẩn xác",
      icon: <GitMerge className="size-6 text-blue-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/kinship",
      iconBg: "bg-gradient-to-br from-blue-50 to-blue-100/40 border-blue-100/60 group-hover:border-blue-300/60",
      hoverBorderColor: "hover:border-blue-400/80",
      hoverTextColor: "group-hover:text-blue-700",
      glowGradient: "from-blue-500/6 via-indigo-500/3 to-transparent",
      arrowHoverClass: "group-hover:text-blue-700 group-hover:bg-blue-50/60 group-hover:border-blue-200/60",
    },
    {
      title: "Thống kê gia phả",
      description: "Tổng quan dữ liệu và biểu đồ phân tích",
      icon: <BarChart2 className="size-6 text-purple-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/stats",
      iconBg: "bg-gradient-to-br from-purple-50 to-purple-100/40 border-purple-100/60 group-hover:border-purple-300/60",
      hoverBorderColor: "hover:border-purple-400/80",
      hoverTextColor: "group-hover:text-purple-700",
      glowGradient: "from-purple-500/6 via-violet-500/3 to-transparent",
      arrowHoverClass: "group-hover:text-purple-700 group-hover:bg-purple-50/60 group-hover:border-purple-200/60",
    },
  ];

  const adminFeatures = [
    {
      title: "Quản lý Người dùng",
      description: "Phê duyệt tài khoản và phân quyền",
      icon: <Users className="size-6 text-rose-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/users",
      iconBg: "bg-gradient-to-br from-rose-50 to-rose-100/40 border-rose-100/60 group-hover:border-rose-300/60",
      hoverBorderColor: "hover:border-rose-400/80",
      hoverTextColor: "group-hover:text-rose-700",
      glowGradient: "from-rose-500/6 via-red-500/3 to-transparent",
      arrowHoverClass: "group-hover:text-rose-700 group-hover:bg-rose-50/60 group-hover:border-rose-200/60",
    },
    {
      title: "Liên kết Chia sẻ",
      description: "Quản lý các đường link xem gia phả công khai",
      icon: <Share2 className="size-6 text-amber-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/sharing",
      iconBg: "bg-gradient-to-br from-amber-50 to-amber-100/40 border-amber-100/60 group-hover:border-amber-300/60",
      hoverBorderColor: "hover:border-amber-400/80",
      hoverTextColor: "group-hover:text-amber-700",
      glowGradient: "from-amber-500/6 via-yellow-500/3 to-transparent",
      arrowHoverClass: "group-hover:text-amber-700 group-hover:bg-amber-50/60 group-hover:border-amber-200/60",
    },
    {
      title: "Thứ tự gia phả",
      description: "Sắp xếp và xem cấu trúc hệ thống",
      icon: <Network className="size-6 text-indigo-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/lineage",
      iconBg: "bg-gradient-to-br from-indigo-50 to-indigo-100/40 border-indigo-100/60 group-hover:border-indigo-300/60",
      hoverBorderColor: "hover:border-indigo-400/80",
      hoverTextColor: "group-hover:text-indigo-700",
      glowGradient: "from-indigo-500/6 via-blue-500/3 to-transparent",
      arrowHoverClass: "group-hover:text-indigo-700 group-hover:bg-indigo-50/60 group-hover:border-indigo-200/60",
    },
    {
      title: "Sao lưu & Phục hồi",
      description: "Xuất/Nhập dữ liệu toàn hệ thống",
      icon: <Database className="size-6 text-teal-600 transition-transform duration-300 group-hover:scale-110" />,
      href: "/dashboard/data",
      iconBg: "bg-gradient-to-br from-teal-50 to-teal-100/40 border-teal-100/60 group-hover:border-teal-300/60",
      hoverBorderColor: "hover:border-teal-400/80",
      hoverTextColor: "group-hover:text-teal-700",
      glowGradient: "from-teal-500/6 via-emerald-500/3 to-transparent",
      arrowHoverClass: "group-hover:text-teal-700 group-hover:bg-teal-50/60 group-hover:border-teal-200/60",
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
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="space-y-2 sm:space-y-3 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-100/60 border border-amber-200/60 text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">
                ✨ Gia Phả Online
              </span>
              <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
                Lưu Giữ Di Sản Gia Đình
              </h1>
              <p className="text-stone-600 text-xs sm:text-base font-medium leading-relaxed">
                <span className="hidden sm:inline">
                  Chào mừng bạn đến với hệ thống gia phả trực tuyến. Nơi lưu giữ nguồn cội, tôn vinh tổ tiên và kết nối tình thân bền chặt giữa các thế hệ.
                </span>
                <span className="inline sm:hidden">
                  Lưu giữ nguồn cội và kết nối tình thân.
                </span>
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
                    Album ảnh
                    <ArrowRight className="size-3 group-hover/gallery:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-sm font-bold text-stone-850 mt-1 block">Hình ảnh gia đình</span>
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
        <div className="lg:col-span-1 bg-white rounded-3xl border border-stone-200/60 shadow-soft p-5 flex flex-col justify-center relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-soft-hover hover:border-amber-300/80 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>

          <div className="flex items-center justify-center lg:justify-start gap-2 mb-3.5 relative z-10">
            <CalendarDays className="size-4 text-amber-700" />
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Lịch Âm Dương
            </span>
          </div>

          <div className="space-y-3 relative z-10 text-center lg:text-left">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Dương lịch</p>
              <p className="text-base font-bold text-stone-900 mt-0.5">
                {dayOfWeekStr}, Ngày {solarDay} {solarMonthStr}
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Âm lịch</p>
              <p className="text-base font-bold text-stone-900 mt-0.5">
                Ngày {lunar.lunarDayStr} ({lunar.lunarYear})
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
                Sự kiện sắp tới ({upcomingEvents.length})
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
            <div className="h-px flex-1 bg-stone-200/80 block sm:hidden"></div>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-widest shrink-0">Dịch vụ & Tiện ích</span>
            <div className="h-px flex-1 bg-stone-200/80"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {publicFeatures.map((feat) => (
              <Link
                key={feat.href}
                href={feat.href}
                className={`group relative flex flex-col items-center sm:items-start text-center sm:text-left p-6 rounded-3xl bg-white border border-stone-200/60 shadow-soft hover:shadow-soft-hover ${feat.hoverBorderColor} hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
              >
                {/* Decorative subtle background gradient on hover */}
                <div className={`absolute -inset-px bg-gradient-to-br ${feat.glowGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>

                {/* Micro-interaction: Corner arrow indicator */}
                <div className={`absolute top-6 right-6 p-1.5 rounded-full bg-stone-50 border border-stone-100/60 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ${feat.arrowHoverClass} hidden sm:block`}>
                  <ArrowRight className="size-3.5" />
                </div>

                <div
                  className={`size-12 rounded-2xl flex items-center justify-center mb-5 border ${feat.iconBg} transition-all duration-300 group-hover:bg-white`}
                >
                  {feat.icon}
                </div>
                <h4 className={`text-base font-bold text-primary mb-1.5 transition-colors ${feat.hoverTextColor}`}>
                  {feat.title}
                </h4>
                <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                  {feat.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-rose-200/50 block sm:hidden"></div>
              <span className="text-xs font-bold text-rose-800/85 uppercase tracking-widest shrink-0">Hệ thống & Phân quyền</span>
              <div className="h-px flex-1 bg-rose-200/50"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminFeatures.map((feat) => (
                <Link
                  key={feat.href}
                  href={feat.href}
                  className={`group relative flex flex-col items-center sm:items-start text-center sm:text-left p-6 rounded-3xl bg-white border border-stone-200/60 shadow-soft hover:shadow-soft-hover ${feat.hoverBorderColor} hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
                >
                  {/* Decorative subtle background gradient on hover */}
                  <div className={`absolute -inset-px bg-gradient-to-br ${feat.glowGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>

                  {/* Micro-interaction: Corner arrow indicator */}
                  <div className={`absolute top-6 right-6 p-1.5 rounded-full bg-stone-50 border border-stone-100/60 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ${feat.arrowHoverClass} hidden sm:block`}>
                    <ArrowRight className="size-3.5" />
                  </div>

                  <div
                    className={`size-12 rounded-2xl flex items-center justify-center mb-5 border ${feat.iconBg} transition-all duration-300 group-hover:bg-white`}
                  >
                    {feat.icon}
                  </div>
                  <h4 className={`text-base font-bold text-primary mb-1.5 transition-colors ${feat.hoverTextColor}`}>
                    {feat.title}
                  </h4>
                  <p className="text-xs text-secondary leading-relaxed line-clamp-2">
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
