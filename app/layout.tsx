import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "codetalk | AI Code Explainer",
  description: "Map and understand your code with AI and voice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
        {children}
      </body>
    </html>
  );
}
