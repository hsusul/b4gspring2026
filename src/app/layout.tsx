import type { Metadata } from "next";
import type { ReactNode } from "react";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Space Has Highways",
  description:
    "A long-scrolling visual narrative about orbital traffic lanes around Earth.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
