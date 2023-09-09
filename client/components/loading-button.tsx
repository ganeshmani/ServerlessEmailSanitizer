import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type ButtonLoadingProps = {
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

export function ButtonLoading({
  children,
  disabled,
  className,
}: ButtonLoadingProps) {
  return (
    <Button className={className} disabled={disabled}>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {children}
    </Button>
  );
}
