import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Another Intelligence",
  description:
    "An AI assistant built for sharp thinking - with room to create, launch, and explore.",
};

export default function Page() {
  return <LandingPage />;
}
