export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child";
export type UserRole = "admin" | "editor" | "member";

export interface Profile {
  id: string;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  person_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserData {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  person_id: string | null;
  person_full_name: string | null;
}

export interface Person {
  id: string;
  full_name: string;
  gender: Gender;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  avatar_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;

  // Private fields (optional, as they might not be returned for members)
  phone_number?: string | null;
  occupation?: string | null;
  current_residence?: string | null;

  // Lunar Date
  death_lunar_year: number | null;
  death_lunar_month: number | null;
  death_lunar_day: number | null;
  anniversary_lunar_year: number | null;
  anniversary_lunar_month: number | null;
  anniversary_lunar_day: number | null;

  birth_lunar_year: number | null;
  birth_lunar_month: number | null;
  birth_lunar_day: number | null;

  legal_birth_year: number | null;
  legal_birth_month: number | null;
  legal_birth_day: number | null;

  birthday_remind_type: "actual_solar" | "actual_lunar" | "legal_solar";

  // New fields
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  person_a: string; // UUID
  person_b: string; // UUID
  note?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper types for UI
export interface PersonWithDetails extends Person {
  spouses?: Person[];
  children?: Person[];
  parents?: Person[];
}

// ── Contribution (link đóng góp gia phả) ──────────────────────

export interface ContributionEdit {
  person_id: string;
  fields: Partial<Pick<Person,
    "full_name" | "other_names" | "gender" |
    "birth_year" | "birth_month" | "birth_day" |
    "birth_lunar_year" | "birth_lunar_month" | "birth_lunar_day" |
    "death_year" | "death_month" | "death_day" |
    "death_lunar_year" | "death_lunar_month" | "death_lunar_day" |
    "anniversary_lunar_year" | "anniversary_lunar_month" | "anniversary_lunar_day" |
    "is_deceased" | "note"
  >>;
  /** URL ảnh đại diện tạm (litterbox, ~72h). Khi admin duyệt, app copy vào bucket avatars. */
  avatar_temp_url?: string | null;
}

export interface ContributionNewPerson {
  tempId: string;
  fields: Partial<Pick<Person,
    "full_name" | "other_names" | "gender" |
    "birth_year" | "birth_month" | "birth_day" |
    "birth_lunar_year" | "birth_lunar_month" | "birth_lunar_day" |
    "death_year" | "death_month" | "death_day" |
    "death_lunar_year" | "death_lunar_month" | "death_lunar_day" |
    "is_deceased" | "note"
  >>;
  parent_person_id: string;
  relation_type: "biological_child" | "adopted_child";
  /** URL ảnh đại diện tạm (litterbox, ~72h). Khi admin duyệt, app copy vào bucket avatars. */
  avatar_temp_url?: string | null;
}

export interface ContributionPayload {
  edits: ContributionEdit[];
  new_persons: ContributionNewPerson[];
}

export interface ContributionLink {
  id: string;
  token: string;
  scope_person_ids: string[];
  allow_edit: boolean;
  allow_add: boolean;
  note: string | null;
  expires_at: string;
  revoked: boolean;
  created_at: string;
  submission_count: number;
}

export interface PendingContribution {
  id: string;
  link_id: string;
  contributor_name: string;
  contributor_note: string | null;
  payload: ContributionPayload;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
  link_note: string | null;
  scope_person_ids: string[];
}

export interface ContributionContext {
  valid: boolean;
  reason?: "not_found" | "revoked" | "expired";
  allow_edit?: boolean;
  allow_add?: boolean;
  note?: string | null;
  expires_at?: string;
  scope_person_ids?: string[];
  persons?: Person[];
  relationships?: { id: string; type: RelationshipType; person_a: string; person_b: string }[];
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  event_date: string | null; // ISO string or date string
  created_at: string;
  created_by: string | null;
}
