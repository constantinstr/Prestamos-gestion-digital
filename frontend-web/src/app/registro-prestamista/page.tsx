import Link from "next/link";
import { RegistroPrestamista } from "@/components/RegistroPrestamista";

export default function RegistroPrestamistaPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← Volver al inicio
      </Link>
      <div className="mt-6 flex flex-1 items-center justify-center">
        <RegistroPrestamista />
      </div>
    </main>
  );
}
