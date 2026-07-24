"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export function SearchField({
  value,
  onChange,
  onSearch,
  placeholder = "Search",
  label = "Search",
  pending,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  label?: string;
  pending?: boolean;
  className?: string;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn("flex items-end gap-2", className)}
    >
      <div className="min-w-0 flex-1">
        <Input
          type="search"
          name="search"
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          enterKeyHint="search"
          autoComplete="off"
          mono
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
