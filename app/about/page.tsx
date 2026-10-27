// Next.js's own link component. It works like a normal <a> tag, but moves
// between pages inside the app without a full page reload, so it feels instant.
import Link from "next/link";
// The TypeScript type for page info like the browser-tab title.
import type { Metadata } from "next";

// This page's own browser-tab title. It replaces the "TaskFam" title set in
// layout.tsx, but only while you're on this page.
export const metadata: Metadata = {
  title: "About · TaskFam",
};

// The About page. Because this file is at app/about/page.tsx, Next.js shows it
// at "/about" automatically. The folder name becomes the web address, with no
// list of routes to update anywhere else.
export default function About() {
  return (
    // Reuses the "container" and "hero" styles from globals.css so this page
    // lines up with the homepage.
    <main className="container">
      <section className="hero">
        <h1>About TaskFam</h1>
        <p className="hero-subhead">
          TaskFam is a simple weekly task board for our household. Jeff and Ana
          share the grown-up chores, and Tiny gets a few kid-sized jobs.
        </p>
        <p className="hero-subhead">
          Everyone can see what&apos;s on this week, who it&apos;s assigned to,
          and what&apos;s done, so nobody has to keep score in their head.
        </p>
        {/* Link back to the homepage. "href" is the address to go to. */}
        <Link href="/" className="text-link">
          &larr; Back to the task board
        </Link>
      </section>
    </main>
  );
}
