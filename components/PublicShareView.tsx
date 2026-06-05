"use client";

import EventsList from "@/components/EventsList";
import MemberDetailModal from "@/components/modal/MemberDetailModal";
import MembersViews from "@/components/MembersViews";
import ViewToggle, { ViewMode } from "@/components/ViewToggle";
import { MemberListProvider } from "@/context/MemberListContext";
import { Person } from "@/types";
import { CalendarDays, Network } from "lucide-react";
import { useState } from "react";

interface PublicShareViewProps {
  persons: Person[];
  relationships: any[];
  customEvents: any[];
  initialView: ViewMode;
  initialRootId: string | null;
}

export default function PublicShareView({
  persons,
  relationships,
  customEvents,
  initialView,
  initialRootId,
}: PublicShareViewProps) {
  const [activeTab, setActiveTab] = useState<"tree" | "events">("tree");

  return (
    <MemberListProvider
      initialView={initialView}
      initialRootId={initialRootId}
      initialShowAvatar={true}
      persons={persons}
    >
      <div className="flex-1 flex flex-col">
        {/* Tab Switcher */}
        <div className="flex justify-center border-b border-stone-200/80 bg-white/70 backdrop-blur-xl sticky top-16 z-20">
          <div className="flex gap-8 px-4 h-12 items-center">
            <button
              onClick={() => setActiveTab("tree")}
              className={`flex items-center gap-2 h-full text-sm font-bold border-b-2 px-2 transition-all cursor-pointer ${
                activeTab === "tree"
                  ? "border-amber-600 text-amber-800"
                  : "border-transparent text-stone-500 hover:text-stone-850"
              }`}
            >
              <Network className="size-4" />
              Sơ đồ gia phả
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`flex items-center gap-2 h-full text-sm font-bold border-b-2 px-2 transition-all cursor-pointer ${
                activeTab === "events"
                  ? "border-amber-600 text-amber-800"
                  : "border-transparent text-stone-500 hover:text-stone-850"
              }`}
            >
              <CalendarDays className="size-4" />
              Sự kiện dòng họ
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "tree" ? (
          <div className="flex-1 flex flex-col">
            <ViewToggle />
            <MembersViews
              persons={persons}
              relationships={relationships}
              canEdit={false}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
            <EventsList persons={persons} customEvents={customEvents} readOnly={true} />
          </div>
        )}
      </div>

      <MemberDetailModal />
    </MemberListProvider>
  );
}
