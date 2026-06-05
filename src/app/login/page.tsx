"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginApi } from "@/lib/client-api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/books";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginApi(email, password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — imagen de fondo */}
      <div className="hidden lg:flex lg:w-3/5 relative">
        <Image
          src="/images/hero-library.jpg"
          alt="Biblioteca La Casa de las Palabras"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay oscuro con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/40 to-transparent" />

        {/* Texto sobre la imagen */}
        <div className="absolute bottom-16 left-12 max-w-sm">
          <p
            className="text-4xl font-bold text-white leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            La Casa de las Palabras
          </p>
          <p className="mt-3 text-parchment/80 text-base leading-relaxed">
            Gestión de biblioteca — catálogo, préstamos e inventario en un solo lugar.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center bg-parchment px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex flex-col items-center mb-8 lg:items-start">
            <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-wood/40 mb-4">
              <Image
                src="/images/logo.png"
                alt="Logo"
                fill
                className="object-cover"
              />
            </div>
            <h1
              className="text-2xl font-bold text-ink"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Iniciar sesión
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Ingresá con tu cuenta de biblioteca
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="email"
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="w-full mt-2"
            >
              Ingresar
            </Button>
          </form>

          <p className="mt-8 text-xs text-stone-400 text-center">
            La Casa de las Palabras — Sistema de Gestión
          </p>
        </div>
      </div>
    </div>
  );
}
