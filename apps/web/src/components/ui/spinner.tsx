import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";

function Spinner({
  className,
  label = "Loading",
  ...props
}: React.ComponentProps<"svg"> & { label?: string }) {
  const isHidden =
    props["aria-hidden"] === true || props["aria-hidden"] === "true";

  return (
    <Loader2Icon
      {...props}
      aria-label={isHidden ? undefined : label}
      className={cn("size-4 animate-spin", className)}
      role={isHidden ? undefined : "status"}
    />
  )
}

export { Spinner }
