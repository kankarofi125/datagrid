import type { Metadata } from "next";
import { GoogleOneTapHost } from "@/components/auth/GoogleOneTapHost";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Soft Google One Tap on login + signup (top-right GIS prompt) */}
      <GoogleOneTapHost context="signin" />
      {children}
    </>
  );
}
