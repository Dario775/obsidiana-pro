import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PWARegistry } from "../components/pwa-registry";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";

const geist = localFont({
  src: [
    {
      path: "./fonts/GeistVF.woff",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Obsidiana - SaaS Multitenant",
  description: "SaaS multi-tenant de tiendas con POS integrado",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Obsidiana",
  },
};

export const viewport: Viewport = {
  themeColor: "#131313",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased bg-background text-on-background font-body-sm min-h-screen`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <PWARegistry />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
