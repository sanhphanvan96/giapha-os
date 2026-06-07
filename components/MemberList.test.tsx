import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MemberList from "./MemberList";
import { Person } from "@/types";

// next/image không chạy được trong jsdom
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

// PersonCard dùng useMemberListView → safe fallback, nhưng cần mock next/navigation
// để tránh lỗi khi jest-dom resolve module
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makePerson = (overrides: Partial<Person> & { id: string; full_name: string }): Person => ({
  gender: "male",
  birth_year: null,
  birth_month: null,
  birth_day: null,
  death_year: null,
  death_month: null,
  death_day: null,
  avatar_url: null,
  note: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  death_lunar_year: null,
  death_lunar_month: null,
  death_lunar_day: null,
  anniversary_lunar_year: null,
  anniversary_lunar_month: null,
  anniversary_lunar_day: null,
  birth_lunar_year: null,
  birth_lunar_month: null,
  birth_lunar_day: null,
  legal_birth_year: null,
  legal_birth_month: null,
  legal_birth_day: null,
  birthday_remind_type: "actual_solar",
  is_deceased: false,
  is_in_law: false,
  birth_order: null,
  generation: null,
  other_names: null,
  ...overrides,
});

const PERSONS: Person[] = [
  makePerson({ id: "1", full_name: "Nguyen Van An", gender: "male", birth_year: 1980, generation: 1, birth_order: 1 }),
  makePerson({ id: "2", full_name: "Tran Thi Binh", gender: "female", birth_year: 1982, generation: 1, birth_order: 1 }),
  makePerson({ id: "3", full_name: "Nguyen Van Cuong", gender: "male", birth_year: 2005, generation: 2, is_deceased: true }),
  makePerson({ id: "4", full_name: "Le Thi Dung", gender: "female", birth_year: 2007, generation: 2, is_in_law: true }),
  makePerson({ id: "5", full_name: "Pham Van Em", gender: "male", birth_year: 1975, generation: 1, birth_order: 2 }),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MemberList", () => {
  describe("render", () => {
    it("hiển thị tất cả thành viên mặc định", () => {
      render(<MemberList initialPersons={PERSONS} />);
      // 5 PersonCard buttons (mỗi card là 1 button)
      expect(screen.getAllByRole("button")).toHaveLength(5);
    });

    it("hiển thị empty state khi chưa có dữ liệu", () => {
      render(<MemberList initialPersons={[]} />);
      expect(screen.getByText(/chưa có thành viên/i)).toBeInTheDocument();
    });

    it("hiển thị nút Thêm thành viên khi canEdit=true", () => {
      render(<MemberList initialPersons={PERSONS} canEdit />);
      // 5 PersonCard + 1 nút Thêm
      expect(screen.getAllByRole("button")).toHaveLength(6);
    });

    it("ẩn nút Thêm thành viên khi canEdit=false", () => {
      render(<MemberList initialPersons={PERSONS} canEdit={false} />);
      expect(screen.getAllByRole("button")).toHaveLength(5);
    });
  });

  describe("search", () => {
    it("lọc theo tên ASCII", () => {
      render(<MemberList initialPersons={PERSONS} />);
      fireEvent.change(screen.getByPlaceholderText(/tìm kiếm/i), { target: { value: "Binh" } });
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByText("Tran Thi Binh")).toBeInTheDocument();
    });

    it("lọc không phân biệt hoa thường", () => {
      render(<MemberList initialPersons={PERSONS} />);
      fireEvent.change(screen.getByPlaceholderText(/tìm kiếm/i), { target: { value: "binh" } });
      expect(screen.getByText("Tran Thi Binh")).toBeInTheDocument();
    });

    it("hiện empty message khi không tìm thấy", () => {
      render(<MemberList initialPersons={PERSONS} />);
      fireEvent.change(screen.getByPlaceholderText(/tìm kiếm/i), { target: { value: "zzz" } });
      expect(screen.getByText(/không tìm thấy/i)).toBeInTheDocument();
    });
  });

  describe("filter", () => {
    const selectFilter = (value: string) => {
      // Filter select có icon Filter bên cạnh, lấy select đầu tiên
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value } });
    };

    it("filter nam — chỉ hiện 3 thành viên nam", () => {
      render(<MemberList initialPersons={PERSONS} />);
      selectFilter("male");
      // An (male), Cường (male), Em (male) = 3
      expect(screen.getAllByRole("button")).toHaveLength(3);
    });

    it("filter nữ — chỉ hiện thành viên nữ (kể cả dâu)", () => {
      render(<MemberList initialPersons={PERSONS} />);
      selectFilter("female");
      // Bình (female), Dung (female in_law) = 2
      expect(screen.getAllByRole("button")).toHaveLength(2);
    });

    it("filter đã mất — đúng người deceased", () => {
      render(<MemberList initialPersons={PERSONS} />);
      selectFilter("deceased");
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByText("Nguyen Van Cuong")).toBeInTheDocument();
      expect(screen.queryByText("Le Thi Dung")).not.toBeInTheDocument();
    });

    it("filter dâu (in_law_female) — đúng người in_law female", () => {
      render(<MemberList initialPersons={PERSONS} />);
      selectFilter("in_law_female");
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByText("Le Thi Dung")).toBeInTheDocument();
      expect(screen.queryByText("Nguyen Van Cuong")).not.toBeInTheDocument();
    });
  });

  describe("sort", () => {
    const selectSort = (value: string) => {
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[1], { target: { value } });
    };

    // PersonCard render birth_year trong text content → dùng năm để xác định thứ tự
    const getBirthYearOrder = () =>
      screen.getAllByRole("button").map((b) => {
        const match = b.textContent?.match(/(19|20)\d{2}/);
        return match ? Number(match[0]) : null;
      });

    it("sort theo năm sinh tăng dần — 1975 trước 1980", () => {
      render(<MemberList initialPersons={PERSONS} />);
      selectSort("birth_asc");
      const years = getBirthYearOrder().filter(Boolean) as number[];
      expect(years[0]).toBeLessThan(years[years.length - 1]);
      expect(years.indexOf(1975)).toBeLessThan(years.indexOf(1980));
    });

    it("sort theo năm sinh giảm dần — 2007 trước 2005", () => {
      render(<MemberList initialPersons={PERSONS} />);
      selectSort("birth_desc");
      const years = getBirthYearOrder().filter(Boolean) as number[];
      expect(years[0]).toBeGreaterThan(years[years.length - 1]);
      expect(years.indexOf(2007)).toBeLessThan(years.indexOf(2005));
    });
  });
});
