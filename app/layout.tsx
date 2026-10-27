// "Metadata" is a TypeScript type describing the page info Next.js puts in <head>
// (like the browser-tab title). Importing it lets the editor catch typos.
import type { Metadata } from "next";
// Next.js can download Google Fonts at build time and serve them from our own site,
// so visitors don't wait on Google's servers.
import { Geist, Geist_Mono } from "next/font/google";
// Next.js's link component, for moving between pages without a full reload.
import Link from "next/link";
// Site-wide styles. Importing them here (in the root layout) applies them to every page.
import "./globals.css";

// Load the main font. "variable" names a CSS variable (--font-geist-sans) that our
// CSS files can use, and "subsets" only downloads the Latin letters to keep it small.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Load a monospace (fixed-width) font for code-style text, exposed the same way.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Info Next.js puts in the page's <head>: the text on the browser tab and the
// short summary search engines show.
export const metadata: Metadata = {
  title: "TaskFam",
  description: "Chores and to-dos for the whole family, in one place.",
};

// The root layout: the frame that wraps every page on the site. Next.js passes the
// current page in as "children", and we place it inside <body>. The <html> and
// <body> tags live only here, never in individual pages. Anything else written
// here, like the footer, also shows up on every page.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}

        {/* Site footer, shared by every page: copyright on the left, page
            links in the lower-right corner. */}
        <footer className="site-footer">
          <p>&copy; 2026 TaskFam. All rights reserved.</p>
          {/* <nav> marks a group of navigation links, which helps screen readers. */}
          <nav className="footer-nav" aria-label="Footer">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
