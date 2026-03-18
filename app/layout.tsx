import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";


const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
 title:       'Citation Network Mapper',
  description: 'Explore arXiv citation and co-authorship networks interactively.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
