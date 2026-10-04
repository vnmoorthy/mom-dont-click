import type { Metadata } from "next";
import { CaseView } from "@/components/flow/case-view";

export const metadata: Metadata = {
  title: "Your answer — Mom, Don't Click",
  description: "What we found when we opened it for you.",
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseView id={safeDecode(id)} />;
}
