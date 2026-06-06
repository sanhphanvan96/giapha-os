import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PersonSelector from "./PersonSelector";
import { Person } from "@/types";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makePerson = (id: string, full_name: string, extra: Partial<Person> = {}): Person => ({
  id,
  full_name,
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
  generation: 1,
  other_names: null,
  ...extra,
});

const PERSONS: Person[] = [
  makePerson("1", "Nguyen Van An", { birth_year: 1980 }),
  makePerson("2", "Tran Thi Binh", { gender: "female", birth_year: 1982 }),
  makePerson("3", "Le Van Cuong", { birth_year: 2005 }),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PersonSelector", () => {
  describe("trigger button", () => {
    it("hiển thị placeholder khi chưa chọn", () => {
      render(<PersonSelector persons={PERSONS} onSelect={vi.fn()} placeholder="Chọn người..." />);
      expect(screen.getByText("Chọn người...")).toBeInTheDocument();
    });

    it("hiển thị tên người đã chọn", () => {
      render(<PersonSelector persons={PERSONS} selectedId="1" onSelect={vi.fn()} />);
      expect(screen.getByText(/Nguyen Van An/)).toBeInTheDocument();
    });

    it("click trigger → dropdown mở, có ô search", () => {
      render(<PersonSelector persons={PERSONS} onSelect={vi.fn()} />);
      fireEvent.click(screen.getAllByRole("button")[0]);
      expect(screen.getByPlaceholderText(/tìm thành viên/i)).toBeInTheDocument();
    });
  });

  describe("search", () => {
    const openAndSearch = (query: string) => {
      render(<PersonSelector persons={PERSONS} onSelect={vi.fn()} />);
      fireEvent.click(screen.getAllByRole("button")[0]);
      fireEvent.change(screen.getByPlaceholderText(/tìm thành viên/i), {
        target: { value: query },
      });
    };

    it("lọc theo tên", () => {
      openAndSearch("Binh");
      expect(screen.getByText(/Tran Thi Binh/)).toBeInTheDocument();
      expect(screen.queryByText(/Nguyen Van An/)).not.toBeInTheDocument();
    });

    it("lọc theo năm sinh", () => {
      openAndSearch("1980");
      expect(screen.getByText(/Nguyen Van An/)).toBeInTheDocument();
      expect(screen.queryByText(/Tran Thi Binh/)).not.toBeInTheDocument();
    });

    it("hiện không tìm thấy khi search không khớp", () => {
      openAndSearch("zzz");
      expect(screen.getByText(/không tìm thấy kết quả/i)).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("click chọn → gọi onSelect với đúng id", () => {
      const onSelect = vi.fn();
      render(<PersonSelector persons={PERSONS} onSelect={onSelect} />);
      fireEvent.click(screen.getAllByRole("button")[0]);
      fireEvent.click(screen.getByText(/Tran Thi Binh/));
      expect(onSelect).toHaveBeenCalledWith("2");
    });

    it("sau khi chọn → dropdown đóng", () => {
      render(<PersonSelector persons={PERSONS} onSelect={vi.fn()} />);
      fireEvent.click(screen.getAllByRole("button")[0]);
      fireEvent.click(screen.getByText(/Tran Thi Binh/));
      expect(screen.queryByPlaceholderText(/tìm thành viên/i)).not.toBeInTheDocument();
    });

    it("Enter → chọn kết quả đầu tiên", () => {
      const onSelect = vi.fn();
      render(<PersonSelector persons={PERSONS} onSelect={onSelect} />);
      fireEvent.click(screen.getAllByRole("button")[0]);
      fireEvent.keyDown(screen.getByPlaceholderText(/tìm thành viên/i), { key: "Enter" });
      expect(onSelect).toHaveBeenCalledWith("1");
    });
  });

  describe("showAllOption", () => {
    it("hiện option Toàn bộ dữ liệu trong dropdown khi showAllOption=true", () => {
      render(
        <PersonSelector
          persons={PERSONS}
          selectedId="1"  // trigger hiện tên người, không trùng với allOptionLabel
          onSelect={vi.fn()}
          showAllOption
          allOptionLabel="Toàn bộ"
        />,
      );
      fireEvent.click(screen.getAllByRole("button")[0]);
      expect(screen.getByText("Toàn bộ")).toBeInTheDocument();
    });

    it("click Toàn bộ trong dropdown → onSelect(null)", () => {
      const onSelect = vi.fn();
      render(
        <PersonSelector
          persons={PERSONS}
          selectedId="1"  // trigger hiện tên người, không trùng với allOptionLabel
          onSelect={onSelect}
          showAllOption
          allOptionLabel="Toàn bộ"
        />,
      );
      fireEvent.click(screen.getAllByRole("button")[0]);
      fireEvent.click(screen.getByText("Toàn bộ"));
      expect(onSelect).toHaveBeenCalledWith(null);
    });
  });
});
