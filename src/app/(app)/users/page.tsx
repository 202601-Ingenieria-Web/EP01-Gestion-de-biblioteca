"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getUsersApi, createUserApi, updateUserRoleApi } from "@/lib/client-api";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile, Role } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Modal crear usuario ──────────────────────────────────────────────────────

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (u: UserProfile) => void;
}) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState<Role>("USER");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  function reset() {
    setName(""); setEmail(""); setPassword(""); setRole("USER"); setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await createUserApi({ name, email, password, role });
      onCreated(user);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Crear nuevo usuario">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="name"  label="Nombre completo *" value={name}  onChange={e => setName(e.target.value)}  required placeholder="Ana García" />
        <Input id="email" label="Correo electrónico *" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ana@biblioteca.com" />
        <Input id="password" label="Contraseña *" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 8 caracteres" minLength={8} />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">Rol *</span>
          <div className="flex gap-3">
            {(["USER", "ADMIN"] as Role[]).map((v) => (
              <label
                key={v}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm transition-all flex-1 justify-center
                  ${role === v
                    ? "border-wood bg-wood/10 text-wood"
                    : "border-border bg-cream text-ink-soft hover:bg-parchment-dark"
                  }`}
              >
                <input
                  type="radio" name="role" value={v}
                  checked={role === v} onChange={() => setRole(v)}
                  className="sr-only"
                />
                {v === "ADMIN" ? "👑 Administrador" : "📚 Usuario"}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button type="submit" loading={loading}>Crear usuario</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Card de usuario ──────────────────────────────────────────────────────────

function UserCard({
  user: u,
  currentUserId,
  onRoleChange,
}: {
  user: UserProfile;
  currentUserId: string;
  onRoleChange: (id: string, role: Role) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const isSelf = u.id === currentUserId;

  async function toggleRole() {
    if (isSelf) return;
    const newRole: Role = u.role === "ADMIN" ? "USER" : "ADMIN";
    setLoading(true);
    setError(null);
    try {
      const { user: updated } = await updateUserRoleApi(u.id, newRole);
      onRoleChange(u.id, updated.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el rol.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-card-bg border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* Avatar */}
      {u.image ? (
        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border">
          <Image src={u.image} alt={u.name} fill className="object-cover" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-wood flex items-center justify-center text-parchment font-bold text-lg flex-shrink-0 ring-2 ring-border">
          {u.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm truncate">{u.name}</p>
        <p className="text-xs text-stone-500 truncate">{u.email}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          Desde {new Date(u.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </p>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>

      {/* Rol + toggle */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <Badge variant={u.role === "ADMIN" ? "gold" : "muted"}>
          {u.role === "ADMIN" ? "👑 Admin" : "📚 Usuario"}
        </Badge>
        {!isSelf && (
          <Button
            size="sm"
            variant="ghost"
            loading={loading}
            onClick={toggleRole}
            className="text-xs"
          >
            {u.role === "ADMIN" ? "Quitar admin" : "Dar admin"}
          </Button>
        )}
        {isSelf && <span className="text-xs text-stone-400">Tú</span>}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: me } = useAuth();

  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { users } = await getUsersApi();
        if (!cancelled) setUsers(users);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleRoleChange(id: string, role: Role) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: "Georgia, serif" }}>
            Usuarios
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {users.length} {users.length === 1 ? "usuario registrado" : "usuarios registrados"}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin usuarios"
          description={search ? `No hay usuarios que coincidan con "${search}".` : "Aún no hay usuarios registrados."}
          action={
            !search ? (
              <Button onClick={() => setShowCreate(true)}>Crear el primer usuario</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              currentUserId={me?.id ?? ""}
              onRoleChange={handleRoleChange}
            />
          ))}
        </div>
      )}

      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(u) => setUsers((prev) => [u, ...prev])}
      />
    </div>
  );
}
