import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Code Editor",
  description: "A focused browser-based code editor workspace inspired by VS Code.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
