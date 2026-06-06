import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ViewToggle from "./ViewToggle";
import type { ViewMode } from "./ViewToggle";

// Mock framer-motion — layout animation không chạy được trong jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock hook để kiểm soát view state
const mockSetView = vi.fn();
let mockCurrentView: ViewMode = "list";

vi.mock("@/context/MemberListContext", () => ({
  useMemberListView: () => ({
    view: mockCurrentView,
    setView: mockSetView,
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ViewToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentView = "list";
  });

  it("render đủ 4 tab", () => {
    render(<ViewToggle />);
    expect(screen.getByText("Sơ đồ cây")).toBeInTheDocument();
    expect(screen.getByText("Mindmap")).toBeInTheDocument();
    expect(screen.getByText("Bong bóng")).toBeInTheDocument();
    expect(screen.getByText("Danh sách")).toBeInTheDocument();
  });

  it("click Sơ đồ cây → setView('tree')", () => {
    render(<ViewToggle />);
    fireEvent.click(screen.getByText("Sơ đồ cây").closest("button")!);
    expect(mockSetView).toHaveBeenCalledWith("tree");
  });

  it("click Mindmap → setView('mindmap')", () => {
    render(<ViewToggle />);
    fireEvent.click(screen.getByText("Mindmap").closest("button")!);
    expect(mockSetView).toHaveBeenCalledWith("mindmap");
  });

  it("click Bong bóng → setView('bubble')", () => {
    render(<ViewToggle />);
    fireEvent.click(screen.getByText("Bong bóng").closest("button")!);
    expect(mockSetView).toHaveBeenCalledWith("bubble");
  });

  it("click Danh sách → setView('list')", () => {
    render(<ViewToggle />);
    fireEvent.click(screen.getByText("Danh sách").closest("button")!);
    expect(mockSetView).toHaveBeenCalledWith("list");
  });

  it("tab active có class text-stone-900, inactive có text-stone-500", () => {
    mockCurrentView = "tree";
    render(<ViewToggle />);
    const treeBtn = screen.getByText("Sơ đồ cây").closest("button")!;
    const listBtn = screen.getByText("Danh sách").closest("button")!;
    expect(treeBtn).toHaveClass("text-stone-900");
    expect(listBtn).toHaveClass("text-stone-500");
  });
});
