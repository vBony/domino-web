import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function PageContainer({ title, description, children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 lg:p-10", className)}>
      {(title || description) && (
        <div>
          {title && <h1 className="text-2xl font-semibold text-foreground">{title}</h1>}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
