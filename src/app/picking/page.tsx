import React from "react";
import { KanbanBoard } from "@/features/picking/components/KanbanBoard";
import { getSessions } from "@/features/picking/actions/picking";
import { Sidebar } from "@/shared/components/Sidebar";

export default async function PickingPage() {
  const sessions = await getSessions();

  return (
    <div className="min-h-screen flex bg-black overflow-hidden font-mono">
      <Sidebar activeTab="picking" />

      <main className="flex-1 relative overflow-y-auto p-4 lg:p-8">
        <div className="hud-line absolute top-0 left-0 w-full opacity-20" />
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-4">
          <div>
            <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter uppercase">
              Soạn_Hàng
              <span className="text-[var(--primary)]">.</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-2">
              Industrial SaaS / Operations / Picking Flow
            </p>
          </div>
        </header>

        <div className="relative">
          <KanbanBoard initialSessions={sessions} />
        </div>
      </main>
      
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[var(--primary)] opacity-[0.02] blur-[150px] -z-10 pointer-events-none" />
    </div>
  );
}
