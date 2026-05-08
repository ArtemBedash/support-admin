"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();

    await supabase.auth.signOut();

    // После выхода — редиректим на /login.
    // router.refresh() говорит серверным компонентам что сессия изменилась.
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut} className="tab-btn">
      Выйти
    </button>
  );
}
