import type { Metadata, Viewport } from "next";
import { Manrope, DM_Serif_Display } from "next/font/google";
import "@/styles/globals.scss";
import "@/styles/responsive.scss";
import { Pwa } from "@/components/Pwa";
import { PullToRefresh } from "@/components/PullToRefresh";
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const serif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
export const metadata: Metadata = {
  title: {
    default: "Jos Globally — From the Plateau to the World",
    template: "%s | Jos Globally",
  },
  description:
    "A global movement connecting Plateau people, businesses, culture and opportunities.",
  applicationName: "Jos Globally",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jos Globally",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${serif.variable}`}>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <div className="responsive-root">
          <PullToRefresh />
          {children}
          <Pwa />
        </div>
      </body>
    </html>
  );
}
