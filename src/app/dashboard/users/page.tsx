"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Briefcase,
  User as UserIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  Bot,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: "admin" | "manager" | "public_user";
  userType: "human" | "bot";
  createdAt?: string;
  updatedAt?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    fullName: "",
    email: "",
    password: "",
    role: "public_user" as "admin" | "manager" | "public_user",
    userType: "human" as "human" | "bot",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [resUsers, resMe] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/auth/me"),
      ]);

      if (resUsers.ok) {
        const data = await resUsers.json();
        setUsers(data.users || []);
      }
      if (resMe.ok) {
        const meData = await resMe.json();
        setCurrentUser(meData.user || null);
        if (meData.user && meData.user.role !== "admin") {
          window.location.href =
            meData.user.role === "manager"
              ? "/dashboard"
              : "/dashboard/chatbot";
          return;
        }
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let current = true;
    const loadUsers = async () => {
      try {
        const [resUsers, resMe] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/auth/me"),
        ]);
        if (!current) return;
        if (resUsers.ok) {
          const data = await resUsers.json();
          if (current) setUsers(data.users || []);
        }
        if (resMe.ok) {
          const meData = await resMe.json();
          if (!current) return;
          setCurrentUser(meData.user || null);
          if (meData.user && meData.user.role !== "admin") {
            window.location.href = meData.user.role === "manager" ? "/dashboard" : "/dashboard/chatbot";
          }
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        if (current) setLoading(false);
      }
    };
    void loadUsers();
    return () => { current = false; };
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: "",
      fullName: "",
      email: "",
      password: "",
      role: "public_user",
      userType: "human",
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      fullName: user.fullName || "",
      email: user.email,
      password: "",
      role: user.role,
      userType: user.userType || "human",
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (user: UserItem) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menambahkan user.");
      }

      showNotification(
        "success",
        `User "${formData.name}" berhasil ditambahkan.`
      );
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);
    setFormLoading(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui user.");
      }

      showNotification(
        "success",
        `User "${formData.name}" berhasil diperbarui.`
      );
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setFormLoading(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus user.");
      }

      showNotification(
        "success",
        `User "${selectedUser.name}" berhasil dihapus.`
      );
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      showNotification(
        "error",
        err instanceof Error ? err.message : "Gagal menghapus"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const isAdmin = currentUser?.role === "admin";

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return {
          bg: "bg-white/10 text-white border-white/20",
          icon: Shield,
          label: "admin",
        };
      case "manager":
        return {
          bg: "bg-neutral-400/10 text-neutral-300 border-neutral-400/20",
          icon: Briefcase,
          label: "manager",
        };
      default:
        return {
          bg: "bg-neutral-600/10 text-neutral-400 border-neutral-600/30",
          icon: UserIcon,
          label: "public_user",
        };
    }
  };

  const getUserTypeBadge = (userType: "human" | "bot") => userType === "bot"
    ? { label: "Bot", Icon: Bot, className: "border-sky-900/70 bg-sky-950/30 text-sky-300" }
    : { label: "Human", Icon: UserIcon, className: "border-neutral-800 bg-neutral-900 text-neutral-300" };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 ${notification.type === "success"
              ? "bg-[#0a0a0a] border-neutral-700 text-neutral-200"
              : "bg-[#0a0a0a] border-neutral-700 text-neutral-300"
            }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-neutral-300 shrink-0" />
          )}
          <span className="text-sm font-medium">
            {notification.message}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex shrink-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-white" />
            Manajemen Pengguna
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Kelola data akun pengguna, hak akses role, dan kredensial login.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-xl shadow-lg shadow-black/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah User Baru</span>
          </button>
        ) : (
          <div className="text-xs text-neutral-400 bg-[#0a0a0a] border border-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-neutral-300" />
            <span>
              Hanya Admin yang dapat menambah & mengedit user.
            </span>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex shrink-0 flex-col items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-4 md:flex-row">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari nama atau email user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
          />
        </div>

        {/* Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs text-neutral-500 mr-1">
            Filter Role:
          </span>
          {["all", "admin", "manager", "public_user"].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all capitalize cursor-pointer ${roleFilter === role
                  ? "bg-white text-black font-medium shadow-sm"
                  : "bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-white"
                }`}
            >
              {role === "all" ? "Semua Role" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-xl">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-black text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">Email</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Tipe user</th>
                <th className="py-3.5 px-5">Keamanan Sandi</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-900 text-sm">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-neutral-400"
                  >
                    <div className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs">
                      Memuat data pengguna dari MongoDB...
                    </p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-neutral-500"
                  >
                    Tidak ada pengguna yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  const RoleIconComponent = roleBadge.icon;
                  const userTypeBadge = getUserTypeBadge(user.userType || "human");
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-neutral-900/50 transition-colors group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center font-bold text-neutral-200 text-sm ring-1 ring-neutral-800">
                            {user.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {user.name}

                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/20">
                                  Anda
                                </span>
                              )}
                            </div>

                            <span className="text-xs text-neutral-500">
                              ID: {user.id.substring(user.id.length - 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${roleBadge.bg}`}
                        >
                          <RoleIconComponent className="w-3.5 h-3.5" />
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${userTypeBadge.className}`}>
                          <userTypeBadge.Icon className="h-3.5 w-3.5" />
                          {userTypeBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-300">
                          <Lock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Hashed (bcrypt)</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => openDeleteModal(user)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg transition-colors ${isSelf
                                  ? "text-neutral-700 cursor-not-allowed opacity-50"
                                  : "text-neutral-500 hover:text-white hover:bg-neutral-800 cursor-pointer"
                                }`}
                              title={
                                isSelf
                                  ? "Tidak dapat menghapus akun sendiri"
                                  : "Hapus User"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-600 italic">
                            Read-only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-neutral-800 bg-black/60 p-4 text-xs text-neutral-500">
          <span>
            Menampilkan {filteredUsers.length} dari {users.length} user
            terdaftar
          </span>
          <span>
            Password otomatis di-hash sebelum disimpan ke MongoDB
          </span>
        </div>
      </div>

      {/* Modal: Tambah User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/10 text-white rounded-xl">
                <UserPlus className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  Tambah Pengguna Baru
                </h3>
                <p className="text-xs text-neutral-500">
                  Kredensial disimpan langsung ke MongoDB
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Username / Nama Akun
                </label>

                <input
                  type="text"
                  required
                  placeholder="Misal: john_doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />

                <p className="text-[11px] text-neutral-500 mt-1">
                  Nama pendek untuk login dan tampilan sistem.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Nama Lengkap
                  <span className="ml-1.5 text-neutral-300 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                    {`{fullName}`}
                  </span>
                </label>

                <input
                  type="text"
                  placeholder="Misal: John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />

                <p className="text-[11px] text-neutral-500 mt-1">
                  Digunakan oleh AI untuk menyapa. Gunakan{" "}
                  <code className="font-mono text-neutral-300">
                    {`{fullName}`}
                  </code>{" "}
                  di prompt.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Email
                </label>

                <input
                  type="email"
                  required
                  placeholder="johndoe@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Password
                </label>

                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />

                <p className="text-[11px] text-neutral-500 mt-1">
                  Password akan otomatis di-hash dengan bcrypt (10 rounds).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Role
                </label>

                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as
                        | "admin"
                        | "manager"
                        | "public_user",
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                >
                  <option value="public_user">
                    public_user (Pengguna biasa)
                  </option>
                  <option value="manager">
                    manager (Kelola Knowledge Base)
                  </option>
                  <option value="admin">
                    admin (Akses Penuh & User Management)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Tipe user</label>
                <select value={formData.userType} onChange={(e) => setFormData({ ...formData, userType: e.target.value as "human" | "bot" })} className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600">
                  <option value="human">Human</option>
                  <option value="bot">Bot</option>
                </select>
                <p className="mt-1 text-[11px] text-neutral-500">Tipe user untuk pengelompokan; tidak mengubah role atau hak akses.</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {formLoading ? "Menyimpan..." : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/10 text-white rounded-xl">
                <Edit2 className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  Edit Pengguna
                </h3>
                <p className="text-xs text-neutral-500">
                  Perbarui data user {selectedUser.name}
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Username / Nama Akun
                </label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Nama Lengkap
                  <span className="ml-1.5 text-neutral-300 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                    {`{fullName}`}
                  </span>
                </label>

                <input
                  type="text"
                  placeholder="Misal: John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />

                <p className="text-[11px] text-neutral-500 mt-1">
                  Digunakan AI untuk menyapa. Gunakan{" "}
                  <code className="font-mono text-neutral-300">
                    {`{fullName}`}
                  </code>{" "}
                  di prompt.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Email
                </label>

                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Ubah Password (Opsional)
                </label>

                <input
                  type="password"
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Role
                </label>

                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as
                        | "admin"
                        | "manager"
                        | "public_user",
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                >
                  <option value="public_user">public_user</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Tipe user</label>
                <select value={formData.userType} onChange={(e) => setFormData({ ...formData, userType: e.target.value as "human" | "bot" })} className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600">
                  <option value="human">Human</option>
                  <option value="bot">Bot</option>
                </select>
                <p className="mt-1 text-[11px] text-neutral-500">User bot yang terhubung ke skill tidak dapat diubah menjadi human.</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {formLoading ? "Menyimpan..." : "Perbarui User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-900 text-neutral-300 flex items-center justify-center mx-auto mb-4 border border-neutral-800">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              Hapus Pengguna
            </h3>

            <p className="text-xs text-neutral-500 mb-6">
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong className="text-white">
                {selectedUser.name}
              </strong>{" "}
              ({selectedUser.email})? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={formLoading}
                className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl shadow-md transition-all disabled:opacity-60 cursor-pointer"
              >
                {formLoading ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}