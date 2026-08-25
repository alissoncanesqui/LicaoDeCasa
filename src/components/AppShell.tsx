import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient text-primary-foreground">
        <div className="mx-auto w-full max-w-5xl px-5 pt-6 pb-10">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="font-display text-lg font-semibold tracking-tight">
              Escala de Coroinhas
            </Link>
          </div>
          <h1 className="mt-8 font-display text-3xl leading-tight font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 max-w-lg text-sm opacity-80">{subtitle}</p>}
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-3 py-2 text-sm">
          {[
            { to: "/missas", label: "Missas" },
            { to: "/minhas-inscricoes", label: "Minhas inscrições" },
            { to: "/coordenadores", label: "Coordenadores" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}

export function formatarData(data: string) {
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}

export function formatarHora(hora: string) {
  return hora.slice(0, 5);
}

export function diaSemana(data: string) {
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const [y, m, d] = data.split("-").map(Number);
  return dias[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]!;
}
