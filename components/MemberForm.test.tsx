import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MemberForm from "./MemberForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "new-id" }, error: null }) })) })),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
    storage: { from: vi.fn(() => ({ upload: vi.fn(), getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })), remove: vi.fn() })) },
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
    svg: ({ children, ...p }: React.SVGAttributes<SVGSVGElement>) => <svg {...p}>{children}</svg>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const fillName = (name: string) =>
  fireEvent.change(screen.getByPlaceholderText(/nhập họ và tên/i), {
    target: { value: name },
  });

const submitForm = () =>
  fireEvent.submit(screen.getByRole("form") ?? document.querySelector("form")!);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MemberForm", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("render", () => {
    it("nút submit hiển thị 'Thêm thành viên' khi tạo mới", () => {
      render(<MemberForm />);
      expect(screen.getByRole("button", { name: /thêm thành viên/i })).toBeInTheDocument();
    });

    it("nút submit hiển thị 'Lưu thay đổi' khi chỉnh sửa", () => {
      render(<MemberForm isEditing />);
      expect(screen.getByRole("button", { name: /lưu thay đổi/i })).toBeInTheDocument();
    });

    it("ẩn phần thông tin riêng tư khi canEditPrivate=false", () => {
      render(<MemberForm />);
      expect(screen.queryByText(/thông tin riêng tư/i)).not.toBeInTheDocument();
    });

    it("hiện phần thông tin riêng tư khi canEditPrivate=true", () => {
      render(<MemberForm canEditPrivate />);
      expect(screen.getByText(/thông tin riêng tư/i)).toBeInTheDocument();
    });

    it("ẩn trường ngày mất khi chưa tick 'Đã mất'", () => {
      render(<MemberForm />);
      expect(screen.queryByText(/ngày mất/i)).not.toBeInTheDocument();
    });

    it("hiện trường ngày mất sau khi tick 'Đã mất'", () => {
      render(<MemberForm />);
      const checkbox = screen.getByRole("checkbox", { name: /đã mất/i });
      // checkbox dùng sr-only, click vào label wrapper
      fireEvent.click(checkbox);
      expect(screen.getByText(/ngày mất \(âm lịch\)/i)).toBeInTheDocument();
    });
  });

  describe("dirty tracking", () => {
    it("onDirtyChange(true) khi thay đổi họ tên", () => {
      const onDirtyChange = vi.fn();
      render(<MemberForm onDirtyChange={onDirtyChange} />);
      fillName("Nguyen Van A");
      expect(onDirtyChange).toHaveBeenCalledWith(true);
    });

    it("onDirtyChange(false) khi trả về giá trị ban đầu", () => {
      const onDirtyChange = vi.fn();
      render(<MemberForm onDirtyChange={onDirtyChange} />);
      fillName("X");
      fillName("");
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    });
  });

  describe("onCancel callback", () => {
    it("click Hủy bỏ → gọi onCancel prop", () => {
      const onCancel = vi.fn();
      render(<MemberForm onCancel={onCancel} />);
      fireEvent.click(screen.getByRole("button", { name: /hủy bỏ/i }));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  describe("validation", () => {
    it("ngày sinh không hợp lệ (ngày 32) → hiện lỗi", async () => {
      render(<MemberForm />);
      fillName("Test");

      const [dayInput] = screen.getAllByPlaceholderText("Ngày");
      fireEvent.change(dayInput, { target: { value: "32" } });

      fireEvent.submit(document.querySelector("form")!);
      await waitFor(() => {
        expect(screen.getByText(/ngày sinh không hợp lệ/i)).toBeInTheDocument();
      });
    });

    it("tháng sinh không hợp lệ (tháng 13) → hiện lỗi", async () => {
      render(<MemberForm />);
      fillName("Test");

      const monthInputs = screen.getAllByPlaceholderText("Tháng");
      fireEvent.change(monthInputs[0], { target: { value: "13" } });

      fireEvent.submit(document.querySelector("form")!);
      await waitFor(() => {
        expect(screen.getByText(/ngày sinh không hợp lệ/i)).toBeInTheDocument();
      });
    });

    it("năm mất < năm sinh → hiện lỗi", async () => {
      render(<MemberForm />);
      fillName("Test");

      // nhập năm sinh
      const yearInputs = screen.getAllByPlaceholderText("Năm");
      fireEvent.change(yearInputs[0], { target: { value: "1980" } });

      // tick đã mất
      fireEvent.click(screen.getByRole("checkbox", { name: /đã mất/i }));

      // nhập năm mất < năm sinh — death solar năm inputs xuất hiện sau khi tick
      const yearInputsAfter = screen.getAllByPlaceholderText("Năm");
      // last year input là death solar year
      fireEvent.change(yearInputsAfter[yearInputsAfter.length - 1], { target: { value: "1970" } });

      fireEvent.submit(document.querySelector("form")!);
      await waitFor(() => {
        expect(screen.getByText(/năm mất phải lớn hơn/i)).toBeInTheDocument();
      });
    });

    it("ngày sinh giấy tờ không hợp lệ → hiện lỗi riêng", async () => {
      render(<MemberForm />);
      fillName("Test");

      // tick khác ngày sinh giấy tờ
      const legalCheckbox = screen.getByRole("checkbox", {
        name: /khác ngày sinh trên giấy tờ/i,
      });
      fireEvent.click(legalCheckbox);

      // điền ngày tháng giấy tờ không hợp lệ
      const allDayInputs = screen.getAllByPlaceholderText("Ngày");
      fireEvent.change(allDayInputs[allDayInputs.length - 1], { target: { value: "32" } });

      fireEvent.submit(document.querySelector("form")!);
      await waitFor(() => {
        expect(screen.getByText(/ngày sinh trên giấy tờ không hợp lệ/i)).toBeInTheDocument();
      });
    });
  });
});
