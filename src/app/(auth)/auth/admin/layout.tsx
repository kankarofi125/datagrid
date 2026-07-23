import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Sign In",
  description: "Secure staff access to the DataGrid operations console.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
