export type StaffRole = "admin" | "manager";

export type StaffProfile = {
  user_id: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InviteStatus = "active" | "used" | "expired" | "revoked";

export type StaffInvite = {
  id: string;
  role: StaffRole;
  status: InviteStatus;
  created_by_name: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_name: string | null;
  revoked_at: string | null;
};

export type BotPromptVersion = {
  id: string;
  title: string;
  system_prompt: string;
  behavior_fallback: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};
