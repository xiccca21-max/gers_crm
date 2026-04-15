"use client";

import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";
import { normalizeLogin } from "@/lib/username-login";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const signInWithPassword = async () => {
    const user = normalizeLogin(login);
    if (user.length < 3) {
      toast.error("Введите логин (не короче 3 символов).");
      return;
    }
    if (!password) {
      toast.error("Введите пароль.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.username({
        username: user,
        password,
        rememberMe: true,
      });
      if (error) {
        toast.error(error.message || "Не удалось войти.");
        return;
      }
      toast.success("Вход выполнен.");
      window.location.href = "/";
    } catch {
      toast.error("Ошибка входа.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg my-5 w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Вход</CardTitle>
        <CardDescription>Логин и пароль</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="login">Логин</Label>
          <Input
            id="login"
            type="text"
            placeholder="ivan_petrov"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
            onKeyDown={(e) => e.key === "Enter" && signInWithPassword()}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            onKeyDown={(e) => e.key === "Enter" && signInWithPassword()}
          />
        </div>
        <Button onClick={signInWithPassword} disabled={isLoading || !login.trim() || !password}>
          Войти
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link href="/register" className="underline font-medium text-foreground">
            Регистрация
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
