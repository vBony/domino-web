import { Logo } from "@/components/Logo";

export function LoadingScreen({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <Logo />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
