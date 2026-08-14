import Link from "next/link";
import { AdminDashboard } from "@/components/AdminDashboard";

export default function AdminPage() {
  return (
    <main className="flex min-h-screen w-full flex-col bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-6 pt-6">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Volver al inicio
        </Link>
      </div>
      <div className="flex flex-1 items-start justify-center py-10">
        <AdminDashboard />
      </div>
    </main>
  );
}
