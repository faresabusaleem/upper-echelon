import type { Metadata } from "next";
import { JoinSequence } from "@/components/auth/join-sequence";
import { GoogleButton } from "@/components/auth/google-button";

export const metadata: Metadata = {
  title: "Begin your initiation",
  description: "Join Upper Echelon: choose a name, the subjects you care about, and seal your place.",
};

export default function JoinPage() {
  return <JoinSequence googleSlot={<GoogleButton next="/initiation" label="Enter with Google" />} />;
}
