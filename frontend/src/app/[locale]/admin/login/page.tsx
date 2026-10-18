import Image from "next/image";

import { LoginForm } from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-[100svh] lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <Image
          src="/renders/hero.jpg"
          alt=""
          fill
          priority
          sizes="55vw"
          className="kenburns object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40" />
        <div className="absolute right-12 bottom-12 left-12 text-white">
          <p className="eyebrow text-gold">Sharora Sokhtmon · Residence</p>
          <p className="mt-4 max-w-md font-display text-4xl leading-tight font-extrabold tracking-tight">
            Управление продажами квартала
          </p>
        </div>
      </div>
      <div className="grid place-items-center px-4 py-12">
        <LoginForm />
      </div>
    </main>
  );
}
