import type { Metadata } from "next";
import { ConsoleClient } from "./ConsoleClient";

export const metadata: Metadata = {
  title: "Presenter console · Mom, Don't Click",
  description: "Run the live demo: send example emails as Mom, watch the cases, control the wall.",
  robots: { index: false, follow: false },
};

export default function ConsolePage() {
  return <ConsoleClient />;
}
