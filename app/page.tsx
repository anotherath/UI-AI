import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Another Intelligence",
  description:
    "A quieter workspace for thinking with AI — projects, shared knowledge, and chats that stay where they belong.",
};

export default function Page() {
  return <LandingPage />;
}
