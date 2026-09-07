"use client";

import { useParams } from "next/navigation";
import { SharedRoute } from "@/components/planner/SharedRoute";

export default function SharedTokenPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  return <SharedRoute token={token ?? ""} />;
}
