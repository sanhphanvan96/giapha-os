"use client";

import { ViewMode } from "@/components/ViewToggle";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

interface MemberListViewState {
  memberModalId: string | null;
  setMemberModalId: (id: string | null) => void;
  showCreateMember: boolean;
  setShowCreateMember: (show: boolean) => void;
  showAvatar: boolean;
  setShowAvatar: (show: boolean) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  rootId: string | null;
  setRootId: (id: string | null) => void;
  // Shared filter state (persists across view switches)
  hideDaughtersInLaw: boolean;
  setHideDaughtersInLaw: (val: boolean) => void;
  hideSonsInLaw: boolean;
  setHideSonsInLaw: (val: boolean) => void;
  hideDaughters: boolean;
  setHideDaughters: (val: boolean) => void;
  hideSons: boolean;
  setHideSons: (val: boolean) => void;
  hideMales: boolean;
  setHideMales: (val: boolean) => void;
  hideFemales: boolean;
  setHideFemales: (val: boolean) => void;
  hideExpandButtons: boolean;
  setHideExpandButtons: (val: boolean) => void;
  autoCollapseLevel: number;
  setAutoCollapseLevel: (val: number) => void;
}

export const MemberListContext = createContext<MemberListViewState | undefined>(
  undefined,
);

export function MemberListProvider({
  children,
  initialView,
  initialRootId,
  initialShowAvatar,
}: {
  children: React.ReactNode;
  initialView?: ViewMode;
  initialRootId?: string | null;
  initialShowAvatar?: boolean;
}) {
  const searchParams = useSearchParams();

  // Initialize state directly from URL to avoid flash of wrong view
  const [memberModalId, setMemberModalId] = useState<string | null>(
    () => searchParams.get("memberModalId") ?? null,
  );
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showAvatar, setShowAvatar] = useState<boolean>(
    () => initialShowAvatar ?? searchParams.get("avatar") !== "hide",
  );
  const [view, setViewState] = useState<ViewMode>(
    () => initialView ?? (searchParams.get("view") as ViewMode | null) ?? "tree",
  );
  const [rootId, setRootIdState] = useState<string | null>(
    () => initialRootId ?? searchParams.get("rootId") ?? null,
  );

  // Shared filter state — persists when switching between Tree / Mindmap / Bubble
  const [hideDaughtersInLaw, setHideDaughtersInLaw] = useState(false);
  const [hideSonsInLaw, setHideSonsInLaw] = useState(false);
  const [hideDaughters, setHideDaughters] = useState(false);
  const [hideSons, setHideSons] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [hideExpandButtons, setHideExpandButtons] = useState(false);
  const [autoCollapseLevel, setAutoCollapseLevel] = useState(2);

  // Initialize from URL and listen to Next.js route changes
  useEffect(() => {
    const syncFromURL = () => {
      if (typeof window === "undefined") return;

      const sp = new URLSearchParams(window.location.search);

      const avatarParam = sp.get("avatar");
      setShowAvatar(avatarParam !== "hide");

      const viewParam = sp.get("view") as ViewMode;
      if (viewParam) setViewState(viewParam);

      const rootIdParam = sp.get("rootId");
      setRootIdState(rootIdParam);

      const modalId = sp.get("memberModalId");
      setMemberModalId(modalId);
    };

    syncFromURL();
  }, [searchParams]);

  // Sync to URL silently
  const updateModalId = (id: string | null) => {
    setMemberModalId(id);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("memberModalId", id);
      } else {
        newUrl.searchParams.delete("memberModalId");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const updateAvatar = (show: boolean) => {
    setShowAvatar(show);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (!show) {
        newUrl.searchParams.set("avatar", "hide");
      } else {
        newUrl.searchParams.delete("avatar");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const setView = (v: ViewMode) => {
    setViewState(v);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("view", v);
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const setRootId = (id: string | null) => {
    setRootIdState(id);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("rootId", id);
      } else {
        newUrl.searchParams.delete("rootId");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  return (
    <MemberListContext.Provider
      value={{
        memberModalId,
        setMemberModalId: updateModalId,
        showCreateMember,
        setShowCreateMember,
        showAvatar,
        setShowAvatar: updateAvatar,
        view,
        setView,
        rootId,
        setRootId,
        hideDaughtersInLaw,
        setHideDaughtersInLaw,
        hideSonsInLaw,
        setHideSonsInLaw,
        hideDaughters,
        setHideDaughters,
        hideSons,
        setHideSons,
        hideMales,
        setHideMales,
        hideFemales,
        setHideFemales,
        hideExpandButtons,
        setHideExpandButtons,
        autoCollapseLevel,
        setAutoCollapseLevel,
      }}
    >
      {children}
    </MemberListContext.Provider>
  );
}

export function useMemberListView(): MemberListViewState {
  const context = useContext(MemberListContext);
  // Return a safe no-op fallback when used outside MemberListProvider
  // (e.g., on the /dashboard/members/[id] standalone page)
  if (context === undefined) {
    return {
      memberModalId: null,
      setMemberModalId: () => {},
      showCreateMember: false,
      setShowCreateMember: () => {},
      showAvatar: true,
      setShowAvatar: () => {},
      view: "tree",
      setView: () => {},
      rootId: null,
      setRootId: () => {},
      hideDaughtersInLaw: false,
      setHideDaughtersInLaw: () => {},
      hideSonsInLaw: false,
      setHideSonsInLaw: () => {},
      hideDaughters: false,
      setHideDaughters: () => {},
      hideSons: false,
      setHideSons: () => {},
      hideMales: false,
      setHideMales: () => {},
      hideFemales: false,
      setHideFemales: () => {},
      hideExpandButtons: false,
      setHideExpandButtons: () => {},
      autoCollapseLevel: 2,
      setAutoCollapseLevel: () => {},
    };
  }
  return context;
}
