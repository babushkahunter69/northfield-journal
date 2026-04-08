import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://northfield-journal.vercel.app"),

  title: {
    default:
      "Northfield Journal | Thoughtful writing on education, learning, and teaching",
    template: "%s | Northfield Journal",
  },

  description:
    "Northfield Journal publishes clear, practical writing on student success, teaching strategies, education systems, and EdTech.",

  keywords: [
    "education blog",
    "education journal",
    "student success tips",
    "study habits",
    "teaching strategies",
    "education system insights",
    "edtech tools",
    "learning techniques",
  ],

  openGraph: {
    title: "Northfield Journal",
    description:
      "Clear writing on learning, teaching, and education systems.",
    url: "https://northfield-journal.vercel.app",
    siteName: "Northfield Journal",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Northfield Journal",
    description:
      "Clear writing on learning, teaching, and education systems.",
  },

  alternates: {
    canonical: "https://northfield-journal.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}