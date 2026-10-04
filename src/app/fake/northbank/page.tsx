import type { Metadata } from "next";
import { Northbank } from "./Northbank";

// Training page for a fictional brand. Kept out of search engines.
export const metadata: Metadata = {
  title: "Northbank Online - Sign in",
  description: "Training page for Mom, Don't Click. Fictional brand. Nothing you type is sent or stored.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function NorthbankPage() {
  return <Northbank />;
}
