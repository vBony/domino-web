import { Outlet } from "react-router-dom";
import { Logo } from "@/components/Logo";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <Logo />
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}
