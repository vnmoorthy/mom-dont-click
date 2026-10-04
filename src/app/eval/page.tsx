import type { Metadata } from "next";
import { EvalClient } from "./EvalClient";

export const metadata: Metadata = {
  title: "How accurate is it? · Mom, Don't Click",
  description:
    "A small labelled set of scam and genuine messages, run through the same pipeline as a forwarded email. This is the score.",
};

export default function EvalPage() {
  return <EvalClient />;
}
