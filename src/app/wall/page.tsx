import type { Metadata, Viewport } from "next";
import { Wall } from "@/components/wall/Wall";

export const metadata: Metadata = {
  title: "The Wall · Mom, Don't Click",
  description:
    "The big screen: every sketchy message the room sends in, opened in a throwaway browser and answered in one plain sentence.",
};

export const viewport: Viewport = {
  themeColor: "#0d0b09",
  width: "device-width",
  initialScale: 1,
};

export default function WallPage() {
  return <Wall />;
}
