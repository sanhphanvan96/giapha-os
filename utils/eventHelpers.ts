import { Lunar, Solar } from "lunar-javascript";

export type EventType = "birthday" | "death_anniversary" | "custom_event";

export interface FamilyEvent {
  personId: string | null;
  personName: string;
  type: EventType;
  /** Solar date of the next occurrence */
  nextOccurrence: Date;
  /** Days until the next occurrence (negative = already passed this year, shown for context) */
  daysUntil: number;
  /** Display label for the date of the event (e.g., "12/03" solar or "05/02 ÂL") */
  eventDateLabel: string;
  /** The actual year of original event (birth year or death year) */
  originYear?: number | null;
  originMonth?: number | null;
  originDay?: number | null;
  /** Whether the person is deceased */
  isDeceased: boolean;
  /** Whether originDay/originMonth are lunar calendar values */
  isLunar?: boolean;
  /** Optional location for the event */
  location?: string | null;
  /** Optional content/description for the event */
  content?: string | null;
}

export interface CustomEventRecord {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

/**
 * Finds the next solar Date on which a given lunar (month, day) falls,
 * starting from `fromDate`.
 */
function nextSolarForLunar(
  lunarMonth: number,
  lunarDay: number,
  fromDate: Date,
): Date | null {
  // Derive the current lunar year by converting today's solar date to lunar
  const todaySolar = Solar.fromYmd(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    fromDate.getDate(),
  );
  const currentLunarYear = todaySolar.getLunar().getYear();

  // Try this lunar year and the next two (to handle leap months & edge cases)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LunarClass = Lunar as any;
  for (let offset = 0; offset <= 2; offset++) {
    try {
      const l = LunarClass.fromYmd(
        currentLunarYear + offset,
        lunarMonth,
        lunarDay,
      );
      const s = l.getSolar();
      const candidate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
      if (candidate >= fromDate) return candidate;
    } catch {
      // lunar date may not exist in this year (e.g., leap month); try next
    }
  }
  return null;
}

/**
 * Computes upcoming FamilyEvents from a list of persons.
 * - Birthdays use the solar birth_month / birth_day.
 * - Death anniversaries (ngày giỗ) are observed on the *lunar* date of death.
 */
export function computeEvents(
  persons: {
    id: string;
    full_name: string;
    birth_year: number | null;
    birth_month: number | null;
    birth_day: number | null;
    death_year: number | null;
    death_month: number | null;
    death_day: number | null;
    death_lunar_year: number | null;
    death_lunar_month: number | null;
    death_lunar_day: number | null;
    anniversary_lunar_year?: number | null;
    anniversary_lunar_month?: number | null;
    anniversary_lunar_day?: number | null;
    is_deceased: boolean;
    birth_lunar_year?: number | null;
    birth_lunar_month?: number | null;
    birth_lunar_day?: number | null;
    legal_birth_year?: number | null;
    legal_birth_month?: number | null;
    legal_birth_day?: number | null;
    birthday_remind_type?: string | null;
  }[],
  customEvents: CustomEventRecord[] = []
): FamilyEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events: FamilyEvent[] = [];

  for (const p of persons) {
    // Determine birthday date parameters based on birthday_remind_type
    let bDay: number | null = null;
    let bMonth: number | null = null;
    let bYear: number | null = null;
    let isLunar = false;

    const remindType = p.birthday_remind_type || "actual_solar";

    if (remindType === "actual_lunar" && p.birth_lunar_day && p.birth_lunar_month) {
      bDay = p.birth_lunar_day;
      bMonth = p.birth_lunar_month;
      bYear = p.birth_lunar_year ?? null;
      isLunar = true;
    } else if (remindType === "legal_solar" && p.legal_birth_day && p.legal_birth_month) {
      bDay = p.legal_birth_day;
      bMonth = p.legal_birth_month;
      bYear = p.legal_birth_year ?? null;
      isLunar = false;
    } else if (p.birth_day && p.birth_month) {
      bDay = p.birth_day;
      bMonth = p.birth_month;
      bYear = p.birth_year ?? null;
      isLunar = false;
    }

    // ── Birthday ────────────────────────────────────────────
    if (bDay && bMonth) {
      if (isLunar) {
        // Lunar birthday reminder logic
        const next = nextSolarForLunar(bMonth, bDay, today);
        if (next) {
          const daysUntil = Math.round(
            (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          const baseEvent: FamilyEvent = {
            personId: p.id,
            personName: p.full_name,
            type: "birthday",
            nextOccurrence: next,
            daysUntil,
            eventDateLabel: `${bDay.toString().padStart(2, "0")}/${bMonth.toString().padStart(2, "0")} ÂL`,
            originYear: bYear || null,
            originMonth: bMonth,
            originDay: bDay,
            isDeceased: p.is_deceased,
            isLunar: true,
          };
          events.push(baseEvent);

          // Past occurrence: find this year's lunar date converted to solar
          // If daysUntil > 0, the event already passed for the previous lunar year cycle
          if (daysUntil > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const LunarClass = Lunar as any;
            const todaySolar = Solar.fromYmd(
              today.getFullYear(),
              today.getMonth() + 1,
              today.getDate(),
            );
            const currentLunarYear = todaySolar.getLunar().getYear();
            try {
              const pastLunar = LunarClass.fromYmd(currentLunarYear, bMonth, bDay);
              const pastSolar = pastLunar.getSolar();
              const pastDate = new Date(pastSolar.getYear(), pastSolar.getMonth() - 1, pastSolar.getDay());
              if (pastDate < today) {
                const pastDaysUntil = Math.round(
                  (pastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                );
                events.push({
                  ...baseEvent,
                  nextOccurrence: pastDate,
                  daysUntil: pastDaysUntil,
                });
              }
            } catch {
              // Skip if past lunar date doesn't exist
            }
          }
        }
      } else {
        // Solar birthday reminder logic
        const thisYear = today.getFullYear();
        const thisYearDate = new Date(thisYear, bMonth - 1, bDay);
        const isUpcoming = thisYearDate >= today;

        // Next occurrence (upcoming)
        const next = isUpcoming
          ? thisYearDate
          : new Date(thisYear + 1, bMonth - 1, bDay);

        const daysUntil = Math.round(
          (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        const baseEvent: FamilyEvent = {
          personId: p.id,
          personName: p.full_name,
          type: "birthday",
          nextOccurrence: next,
          daysUntil,
          eventDateLabel: `${bDay.toString().padStart(2, "0")}/${bMonth.toString().padStart(2, "0")}`,
          originYear: bYear || null,
          originMonth: bMonth,
          originDay: bDay,
          isDeceased: p.is_deceased,
        };
        events.push(baseEvent);

        // Past occurrence (already happened this year)
        if (!isUpcoming) {
          const pastDaysUntil = Math.round(
            (thisYearDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );
          events.push({
            ...baseEvent,
            nextOccurrence: thisYearDate,
            daysUntil: pastDaysUntil,
          });
        }
      }
    }

    // ── Death anniversary (lunar) ────────────────────────────────────
    if (p.is_deceased && ((p.death_lunar_month && p.death_lunar_day) || (p.death_month && p.death_day))) {
      try {
        let lMonth: number;
        let lDay: number;
        
        // Prefer custom anniversary date, then exact lunar death date, then convert solar
        if (p.anniversary_lunar_month && p.anniversary_lunar_day) {
          lMonth = p.anniversary_lunar_month;
          lDay = p.anniversary_lunar_day;
        } else if (p.death_lunar_month && p.death_lunar_day) {
          lMonth = p.death_lunar_month;
          lDay = p.death_lunar_day;
        } else {
          // Fallback: Convert the solar death date to a lunar date
          const deathYear = p.death_year ?? new Date().getFullYear();
          const solar = Solar.fromYmd(deathYear, p.death_month as number, p.death_day as number);
          const lunar = solar.getLunar();
          lMonth = Math.abs(lunar.getMonth()); // abs to handle leap month
          lDay = lunar.getDay();
        }

        const next = nextSolarForLunar(lMonth, lDay, today);
        if (!next) continue;

        const daysUntil = Math.round(
          (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        const deathEvent: FamilyEvent = {
          personId: p.id,
          personName: p.full_name,
          type: "death_anniversary",
          nextOccurrence: next,
          daysUntil,
          eventDateLabel: `${lDay.toString().padStart(2, "0")}/${lMonth.toString().padStart(2, "0")} ÂL`,
          originYear: (p.death_lunar_year ?? p.death_year) || null,
          originMonth: p.death_lunar_month ?? p.death_month,
          originDay: p.death_lunar_day ?? p.death_day,
          isDeceased: p.is_deceased,
        };
        events.push(deathEvent);

        // Past occurrence: find this year's lunar date converted to solar
        // If daysUntil > 0, the event already passed for the previous lunar year cycle
        if (daysUntil > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const LunarClass = Lunar as any;
          const todaySolar = Solar.fromYmd(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate(),
          );
          const currentLunarYear = todaySolar.getLunar().getYear();
          try {
            const pastLunar = LunarClass.fromYmd(currentLunarYear, lMonth, lDay);
            const pastSolar = pastLunar.getSolar();
            const pastDate = new Date(pastSolar.getYear(), pastSolar.getMonth() - 1, pastSolar.getDay());
            if (pastDate < today) {
              const pastDaysUntil = Math.round(
                (pastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
              );
              events.push({
                ...deathEvent,
                nextOccurrence: pastDate,
                daysUntil: pastDaysUntil,
              });
            }
          } catch {
            // Skip if past lunar date doesn't exist
          }
        }
      } catch {
        // Skip if lunar conversion fails
      }
    }
  }

  // ── Custom Events (solar) ───────────────────────────────────────
  for (const ce of customEvents) {
    if (!ce.event_date) continue;
    const [y, m, d] = ce.event_date.split("-").map(Number);
    if (!y || !m || !d) continue;

    const next = new Date(y, m - 1, d);
    const daysUntil = Math.round(
      (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    events.push({
      personId: ce.id, // using event id here
      personName: ce.name, // mapping custom event name to personName
      type: "custom_event",
      nextOccurrence: next,
      daysUntil,
      eventDateLabel: `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`,
      originYear: y,
      isDeceased: false,
      location: ce.location,
      content: ce.content,
    });
  }

  // Sort: soonest first
  events.sort((a, b) => a.daysUntil - b.daysUntil);
  return events;
}
