export type Message = {
  id: string;
  text: string;
  role: "user" | "bot" | "admin";
  created_at: string;
  dialog: {
    id: string;
    telegram_chat_id: number;
    assigned_to: string | null;
    profile: {
      username: string | null;
      first_name: string | null;
      last_name: string | null;
    };
  };
};
