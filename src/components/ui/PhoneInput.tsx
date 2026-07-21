"use client";

import { Input } from "@/components/ui/Input";
import {
  NG_LOCAL_MAX_DIGITS,
  sanitizeNgPhoneInput,
} from "@/lib/phone";
import type { InputHTMLAttributes } from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode" | "maxLength"
> & {
  label?: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
};

/**
 * Nigerian mobile input: digits only, max 11 (0 + 10-digit NSN).
 * Example valid: 08125679851
 */
export function PhoneInput({
  label = "Phone number",
  hint = "11 digits · e.g. 08125679851",
  error,
  value,
  onChange,
  placeholder = "08125679851",
  mono = true,
  ...rest
}: Props & { mono?: boolean }) {
  return (
    <Input
      {...rest}
      label={label}
      hint={error ? undefined : hint}
      error={error}
      mono={mono}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      maxLength={NG_LOCAL_MAX_DIGITS}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(sanitizeNgPhoneInput(e.target.value))}
    />
  );
}
