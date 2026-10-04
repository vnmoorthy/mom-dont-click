import type { Metadata } from "next";
import { GuardScreen } from "@/components/flow/guard-screen";

export const metadata: Metadata = {
  title: "Guard someone you love — Mom, Don't Click",
  description: "Be the first to know when a scam reaches them, without being the help desk.",
};

export default function GuardPage() {
  return <GuardScreen />;
}
