"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { usePendingAction } from "@/hooks/usePendingAction";

export function LogoutButton() {
  const router = useRouter();
  const { pending, run } = usePendingAction<"logout">();

  return (
    <Button
      variant="ghost"
      fullWidth
      loading={pending}
      onClick={() =>
        void run("logout", async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        })
      }
    >
      {pending ? "Signing out…" : "Log out"}
    </Button>
  );
}
