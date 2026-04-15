"use client";

import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";
import { internalEmailFromLogin, normalizeLogin } from "@/lib/username-login";

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

export function RegisterComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Введите имя.");
      return;
    }
    const user = normalizeLogin(login);
    if (user.length < 3) {
      toast.error("Логин не короче 3 символов: латиница, цифры, подчёркивание.");
      return;
    }
    if (password.length < 8) {
      toast.error("Пароль не короче 8 символов.");
      return;
    }
    if (password !== confirm) {
      toast.error("Пароли не совпадают.");
      return;
    }
    setIsLoading(true);
    try {
      const email = internalEmailFromLogin(login);
      const { error, data } = await authClient.signUp.email({
        name: name.trim(),
        email,
        password,
        username: user,
      });
      if (error) {
        console.error("[register] signUp.email failed", {
          message: error.message,
          status: (error as { status?: number }).status,
          code: (error as { code?: string }).code,
          data,
        });
        toast.error(error.message || "Не удалось зарегистрироваться.");
        return;
      }
      toast.success("Аккаунт создан.");
      window.location.href = "/";
    } catch (e) {
      console.error("[register] exception", e);
      const msg = e instanceof Error ? e.message : "Ошибка регистрации.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg my-5 w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Регистрация</CardTitle>
        <CardDescription>Имя, логин и пароль — без почты</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="reg-name">Имя</Label>
          <Input
            id="reg-name"
            type="text"
            placeholder="Иван Иванов"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            autoComplete="name"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reg-login">Логин</Label>
          <Input
            id="reg-login"
            type="text"
            placeholder="ivan_petrov"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
          />
          <p className="text-xs text-muted-foreground">
            Латинские буквы, цифры и «_», не короче 3 символов после нормализации.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reg-password">Пароль</Label>
          <Input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reg-confirm">Пароль ещё раз</Label>
          <Input
            id="reg-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isLoading}
            autoComplete="new-password"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <Button onClick={submit} disabled={isLoading}>
          Зарегистрироваться
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/sign-in" className="underline font-medium text-foreground">
            Вход
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
