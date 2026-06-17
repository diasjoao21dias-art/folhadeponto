import { Sidebar } from "@/components/layout/sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background w-full">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen px-4 pt-16 pb-8 sm:px-6 lg:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
