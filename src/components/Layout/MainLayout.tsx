
import { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="flex flex-col w-full">
        <header className="bg-card h-16 shadow-sm flex items-center px-6">
          <h1 className="text-xl font-semibold text-primary">Ntik</h1>
        </header>
        <main className="p-6 school-content">
          {children}
        </main>
      </div>
    </div>
  );
}
