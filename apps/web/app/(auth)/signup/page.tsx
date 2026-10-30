import { Suspense } from "react";
import type { Metadata } from "next";
import Flow from "../flow";

export const metadata: Metadata = { title: "TaskLens — Crear cuenta" };

export default function SignupPage() {
  return (
    <Suspense>
      <Flow mode="signup" />
    </Suspense>
  );
}
