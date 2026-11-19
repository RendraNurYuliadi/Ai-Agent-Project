"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GenAIRoutePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/providers");
  }, [router]);

  return null;
}
