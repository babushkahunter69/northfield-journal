import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://northfield-journal.vercel.app"),
  title: {
    default: "Northfield Journal | Thoughtful writing on education, learning, and teaching",
    template: "%s | Northfield Journal",
  },
  description:
    "Northfield Journal publishes thoughtful writing on student success, teaching craft, education systems, and practical EdTech.",
  keywords: [
    "education journal",
    "education blog",
    "student success",
    "teaching craft",
    "education systems",
    "edtech",
    "teaching strategies",
    "study habits",
  ],
  openGraph: {
    title: "Northfield Journal",
    description:
      "Thoughtful writing on learning, teaching, and education systems.",
    url: "https://northfield-journal.vercel.app",
    siteName: "Northfield Journal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Northfield Journal",
    description:
      "Thoughtful writing on learning, teaching, and education systems.",
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