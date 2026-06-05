"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

function BookIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function LoanIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: "/books",     label: "Catálogo",   icon: <BookIcon /> },
  { href: "/loans",     label: "Préstamos",  icon: <LoanIcon /> },
  { href: "/inventory", label: "Inventario", icon: <InventoryIcon />, adminOnly: true },
  { href: "/users",     label: "Usuarios",   icon: <UsersIcon />, adminOnly: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "ADMIN"
  );

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar-bg border-r border-stone-800">
      {/* Logo + nombre */}
      <div className="flex flex-col items-center gap-3 px-6 py-7 border-b border-stone-800">
        <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-gold/40 bg-white">
          <Image
            src="/images/logo.png"
            alt="Logo La Casa de las Palabras"
            fill
            className="object-cover"
          />
        </div>
        <div className="text-center">
          <h1
            className="text-sidebar-text text-sm font-bold leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            La Casa de las Palabras
          </h1>
          <p className="text-sidebar-muted text-xs mt-0.5">Biblioteca</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Navegación principal">
        {visibleItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${
                  active
                    ? "bg-wood text-parchment shadow-sm"
                    : "text-sidebar-text hover:bg-stone-800 hover:text-parchment"
                }
              `}
            >
              <span className={active ? "text-parchment" : "text-sidebar-muted"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Perfil + logout */}
      <div className="px-3 pb-5 border-t border-stone-800 pt-4">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            {user.image ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-stone-700">
                <Image src={user.image} alt={user.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-wood flex items-center justify-center text-parchment text-xs font-bold ring-1 ring-stone-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-text text-xs font-medium truncate">{user.name}</p>
              <p className="text-sidebar-muted text-xs truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:text-danger hover:bg-stone-800 transition-all duration-150"
        >
          <LogoutIcon />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
