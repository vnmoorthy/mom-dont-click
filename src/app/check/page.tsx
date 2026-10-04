import type { Metadata } from "next";
import { CheckScreen } from "@/components/flow/check-screen";

export const metadata: Metadata = {
  title: "Check something sketchy — Mom, Don't Click",
  description: "Paste a link, a message or a screenshot. We open it in a throwaway browser so you never have to.",
};

export default function CheckPage() {
  return <CheckScreen />;
}
