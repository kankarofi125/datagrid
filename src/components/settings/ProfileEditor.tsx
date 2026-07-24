"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";

export function ProfileEditor({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = name.trim() !== initialName || email.trim() !== initialEmail;

  function save() {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update your profile.");
        return;
      }
      setMessage("Profile updated.");
      router.refresh();
    });
  }

  return (
    <Card className="p-4 lg:p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <CardHeading
          kicker="Personal details"
          title="How we address you"
          className="mb-4"
        />
        <div className="space-y-3.5">
        <Input
          name="name"
          label="Full name"
          autoComplete="name"
          value={name}
          maxLength={70}
          placeholder="Add your full name"
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          value={email}
          maxLength={120}
          placeholder="you@example.com"
          hint="Used for receipts and account recovery."
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-green" role="status">
            {message}
          </p>
        )}
        <Button type="submit" fullWidth disabled={!changed || pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        </div>
      </form>
    </Card>
  );
}
