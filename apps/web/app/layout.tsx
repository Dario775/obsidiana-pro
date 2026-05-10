import type { Metadata } from "next";
import localFont from "next/font/local";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${geist.variable} antialiased bg-background text-on-background font-body-sm min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
