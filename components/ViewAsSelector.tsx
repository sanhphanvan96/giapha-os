"use client";

import { Person } from "@/types";
import { useMemberListView } from "@/context/MemberListContext";
import PersonSelector from "./PersonSelector";
import { EyeOff } from "lucide-react";

export default function ViewAsSelector({ persons }: { persons: Person[] }) {
  const { viewAsPersonId, setViewAsPersonId } = useMemberListView();

  return (
    <PersonSelector
      persons={persons}
      selectedId={viewAsPersonId}
      onSelect={setViewAsPersonId}
      placeholder="Chọn người..."
      label="Xem với tư cách là"
      className="w-full sm:w-72"
      showAllOption
      allOptionLabel="Tắt danh xưng"
      allOptionIcon={<EyeOff className="size-4" />}
    />
  );
}
