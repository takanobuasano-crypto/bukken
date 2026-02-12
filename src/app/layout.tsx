import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "賃貸物件分析ツール",
  description: "SUUMOの物件URLから詳細情報・初期費用・高低差を分析",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
