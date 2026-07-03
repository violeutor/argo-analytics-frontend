import type { Metadata } from "next";
import { Suspense } from "react";
import { C } from "@/lib/tokens";
import { AuthProvider } from "@/lib/AuthProvider";
import { NotificationsProvider } from "@/lib/NotificationsProvider";
import TopNav from "@/components/TopNav";

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
        {/* S85: AuthProvider + NotificationsProvider + TopNav hier statt in
            main.tsx — einziger Ort, der auf jeder Route mountet. Vorher waren
            Nav/Bell nur auf "/" sichtbar (NOTIFICATION-BELL-MISSING-01).
            TopNav nutzt useSearchParams() (aktiver Tab, Sektor-Filter-Klick)
            — das braucht beim Static Prerendering zwingend eine eigene
            Suspense-Grenze, sonst bricht der Build auf JEDER Route ab (layout
            wrapped alles: "/", "/admin", "/_not-found" — genau das Muster,
            das den Vercel-Build hier gerissen hat). fallback=null, da TopNav
            bei fehlender Session ohnehin null rendert — kein Layout-Shift. */}
        <AuthProvider>
          <NotificationsProvider>
            <Suspense fallback={null}>
              <TopNav />
            </Suspense>
            {children}
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
