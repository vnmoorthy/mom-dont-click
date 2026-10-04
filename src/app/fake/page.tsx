import type { Metadata } from "next";
import { FakeIndex } from "./FakeIndex";

export const metadata: Metadata = {
  title: "Training pages · Mom, Don't Click",
  description:
    "Two harmless imitation scam pages for fictional brands, hosted by us so the agent can show what a phishing page asks for next.",
  robots: { index: false, follow: false },
};

export default function FakeIndexPage() {
  return <FakeIndex />;
}
