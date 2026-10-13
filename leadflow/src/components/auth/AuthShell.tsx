import type { ReactNode } from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

const benefits = [
  "Encontre empresas e contatos em poucos cliques",
  "Organize leads, equipe e funil no mesmo painel",
  "Comece com 50 leads mensais sem cartão",
];

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,101,0,0.2),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(255,176,0,0.12),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between p-12 lg:flex xl:p-16">
          <a href="/" className="inline-flex w-fit items-center gap-3">
            <Logo size={44} className="rounded-2xl" />
            <span className="font-display text-lg font-bold tracking-tight">
              JVS <span className="text-primary">LeadFlow</span>
            </span>
          </a>

          <div className="max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/70 backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Sua prospecção começa aqui
            </div>
            <h2 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.04em] xl:text-5xl">
              Menos tempo procurando.
              <br />
              <span className="text-gradient">Mais tempo vendendo.</span>
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/55">
              Transforme pesquisas manuais em um processo comercial organizado, previsível e pronto
              para crescer.
            </p>

            <div className="mt-10 space-y-4">
              {benefits.map((benefit) => (
                <p key={benefit} className="flex items-center gap-3 text-sm text-white/75">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </span>
                  {benefit}
                </p>
              ))}
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs text-white/35">
            <ShieldCheck className="h-4 w-4" />
            Login protegido pelo Supabase Auth
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center p-4 sm:p-8 lg:bg-white/[0.025] lg:backdrop-blur-3xl">
          <div className="w-full max-w-[500px]">
            <a href="/" className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <Logo size={42} className="rounded-2xl" />
              <span className="font-display text-lg font-bold">
                JVS <span className="text-primary">LeadFlow</span>
              </span>
            </a>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_32px_100px_-24px_rgba(0,0,0,.8)] backdrop-blur-2xl sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/50">{description}</p>
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.3H3.1a10 10 0 0 0 0 9.4L6.5 14Z" />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.9.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3.1 7.3l3.4 2.8A5.9 5.9 0 0 1 12 5.9Z"
      />
    </svg>
  );
}
