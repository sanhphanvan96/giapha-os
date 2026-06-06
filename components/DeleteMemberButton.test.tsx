import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DeleteMemberButton from "./DeleteMemberButton";

vi.mock("@/app/actions/member", () => ({
  deleteMemberProfile: vi.fn(),
}));

// isRedirectError từ next internals — luôn trả false trong test
vi.mock("next/dist/client/components/redirect-error", () => ({
  isRedirectError: () => false,
}));

import { deleteMemberProfile } from "@/app/actions/member";
const mockDelete = deleteMemberProfile as ReturnType<typeof vi.fn>;

describe("DeleteMemberButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("render nút Xoá hồ sơ ở trạng thái ban đầu", () => {
    render(<DeleteMemberButton memberId="abc" />);
    const btn = screen.getByRole("button", { name: /xoá hồ sơ/i });
    expect(btn).toBeEnabled();
  });

  it("không xoá khi người dùng hủy confirm", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DeleteMemberButton memberId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /xoá hồ sơ/i }));
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("disable nút và hiện Đang xoá... trong khi gọi server action", async () => {
    // action không resolve ngay
    mockDelete.mockImplementation(() => new Promise(() => {}));
    render(<DeleteMemberButton memberId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /xoá hồ sơ/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /đang xoá/i })).toBeDisabled();
    });
  });

  it("hiển thị lỗi khi action trả về error", async () => {
    mockDelete.mockResolvedValue({ error: "Không đủ quyền xoá." });
    render(<DeleteMemberButton memberId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /xoá hồ sơ/i }));
    await waitFor(() => {
      expect(screen.getByText("Không đủ quyền xoá.")).toBeInTheDocument();
    });
    // nút trở lại enabled
    expect(screen.getByRole("button", { name: /xoá hồ sơ/i })).toBeEnabled();
  });

  it("có thể đóng thông báo lỗi", async () => {
    mockDelete.mockResolvedValue({ error: "Lỗi xoá." });
    render(<DeleteMemberButton memberId="abc" />);
    fireEvent.click(screen.getByRole("button", { name: /xoá hồ sơ/i }));
    await waitFor(() => screen.getByText("Lỗi xoá."));
    // click nút X để đóng
    const closeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Lỗi xoá.")).not.toBeInTheDocument();
  });

  it("gọi action với đúng memberId", async () => {
    mockDelete.mockResolvedValue({});
    render(<DeleteMemberButton memberId="xyz-123" />);
    fireEvent.click(screen.getByRole("button", { name: /xoá hồ sơ/i }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("xyz-123"));
  });
});
