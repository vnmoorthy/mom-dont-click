import type { Metadata } from "next";
import { ParcelFast } from "./ParcelFast";

// Training page for a fictional brand. Kept out of search engines.
export const metadata: Metadata = {
  title: "ParcelFast Delivery - Your parcel is being held",
  description: "Training page for Mom, Don't Click. Fictional brand. Nothing you type is sent or stored.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const DEFAULT_TRACKING = "PF-88217-US";

export default async function ParcelFastPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = (await searchParams).t;
  const raw = Array.isArray(t) ? t[0] : t;
  // Only ever echo something that looks like a tracking number.
  const tracking = raw && /^[A-Za-z0-9-]{4,24}$/.test(raw) ? raw.toUpperCase() : DEFAULT_TRACKING;
  return <ParcelFast tracking={tracking} />;
}
