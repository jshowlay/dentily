import { cn } from "@/lib/utils";

/** Dark header: logo + subtle tagline (white text assumed). */
export function BrandMark({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "admin";
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className="text-lg font-semibold leading-tight">
        Dentily{variant === "admin" ? " Admin" : ""}
      </p>
      <p className="text-[11px] font-medium leading-tight text-white/65">High-intent patient growth</p>
    </div>
  );
}
