import { Suspense } from "react";
import type { Metadata } from "next";
import Flow from "../flow";

export const metadata: Metadata = { title: "TaskLens — Iniciar sesión" };

export default function LoginPage() {
  return (
    <Suspense>
      <Flow mode="login" />
    </Suspense>
  );
}
