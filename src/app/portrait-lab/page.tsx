import type { Metadata } from "next";
import { PortraitLabClient } from "@/components/portrait-lab-client";

export const metadata: Metadata = {
  title: "Portrait Lab · Football Director Pro",
  description: "Internal visual audit surface for generated player and manager portraits.",
};

export default function PortraitLabPage() {
  return <PortraitLabClient />;
}
