"use client";

import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Введите имя.");
      return;
    }
    if (!email.trim()) {
      toast.error("Введите email.");
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
      const { error } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(error.message || "Не удалось зарегистрироваться.");
        return;
      }
      toast.success("Аккаунт создан.");
      window.location.href = "/";
    } catch {
      toast.error("Ошибка регистрации.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg my-5 w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт с email и паролем</CardDescription>
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
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="name@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
          />
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
