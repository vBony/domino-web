import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@services/apiClient";

const loginSchema = z.object({
  nickname: z.string().trim().min(1, "Informe seu nickname"),
  password: z.string().min(1, "Informe sua senha")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nickname: "", password: "" }
  });

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/play";

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof LoginFormValues, { message });
        }
        return;
      }
      setFormError(error instanceof ApiError ? error.message : "Erro ao entrar");
    }
  }

  async function onGuestLogin() {
    setFormError(null);
    setIsGuestLoading(true);
    try {
      await loginAsGuest();
      navigate("/play", { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Erro ao entrar como visitante");
    } finally {
      setIsGuestLoading(false);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Acesse sua conta pra jogar dominó online.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nickname" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button type="submit" disabled={form.formState.isSubmitting} className="mt-2">
              Entrar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isGuestLoading}
              onClick={onGuestLogin}
            >
              Jogar como visitante
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
