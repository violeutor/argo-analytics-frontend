import type { Metadata } from "next";
import { C } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Argo Analytics · Climate Tech Intelligence",
  description:
    "M&A Deal Scoring, IPO Tracking und Investment Path Analysis für Climate Tech.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0, background: C.bg }}>
        {children}
      </body>
    </html>
  );
}
