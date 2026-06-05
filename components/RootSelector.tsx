"use client";

import { Person } from "@/types";
import { useMemberListView } from "@/context/MemberListContext";
import PersonSelector from "./PersonSelector";
import { RotateCcw } from "lucide-react";

export default function RootSelector({
  persons,
  currentRootId,
}: {
  persons: Person[];
  currentRootId: string | null;
}) {
  const { setRootId } = useMemberListView();

  return (
    <PersonSelector
      persons={persons}
      selectedId={currentRootId}
      onSelect={setRootId}
      placeholder="Chọn người..."
      label="Gốc hiển thị"
      className="w-full sm:w-72"
      showAllOption
      allOptionLabel="Mặc định"
      allOptionIcon={<RotateCcw className="size-4" />}
    />
  );
}
