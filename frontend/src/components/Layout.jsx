import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, LayoutGrid, Wallet, LogOut, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: Wallet },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),transparent_30%),radial-gradient(circle_at_top_right,_rgba(147,51,234,0.08),transparent_35%)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/95 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-8">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[var(--color-ledger)]" strokeWidth={2} />
              <span className="font-display text-lg font-medium tracking-tight">Ledger</span>
            </div>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--color-ledger-soft)] text-[var(--color-ledger)]"
                        : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-black/[0.03]"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/transactions/create")}
              className="inline-flex items-center gap-2 rounded-md bg-[linear-gradient(to_bottom_right,#2563eb,#9333ea)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Transaction
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ledger-soft)] text-[var(--color-ledger)]">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="text-sm text-[var(--color-ink-soft)]">{user?.name || user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="hidden text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-rust)] md:inline-flex"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-10">
        <div className="rounded-[2rem] bg-[var(--color-paper)] p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.04)] sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
