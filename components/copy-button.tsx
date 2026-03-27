"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Button variant="outline" size="default" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
