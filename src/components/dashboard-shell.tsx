"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Database,
  Bot,
  LogOut,
  Menu,
  X,
  Sparkles,
  Shield,
  Briefcase,
  User,
  History,
  Zap,
  Route,
  ChevronRight,
  Blocks,
} from "lucide-react";
import { UserSession } from "@/lib/auth";

interface DashboardShellProps {
  children: React.ReactNode;
  user: UserSession;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  badge?: string | null;
  roles?: string[];
}

export default function DashboardShell({
  children,
  user,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigation: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: pathname === "/dashboard",
    },
    {
      name: "Users",
      href: "/dashboard/users",
      icon: Users,
      current: pathname.startsWith("/dashboard/users"),
      roles: ["admin"],
    },
    {
      name: "Chatbot",
      href: "/dashboard/chatbot",
      icon: Bot,
      current: pathname.startsWith("/dashboard/chatbot"),
    },
    {
      name: "Chat History",
      href: "/dashboard/chat-history",
      icon: History,
      current: pathname.startsWith("/dashboard/chat-history"),
    },
    {
      name: "Knowledge Base",
      href: "/dashboard/knowledge-base",
      icon: Database,
      current: pathname.startsWith("/dashboard/knowledge-base"),
      roles: ["admin", "manager"],
    },
    {
      name: "Components",
      href: "/dashboard/components",
      icon: Blocks,
      current: pathname.startsWith("/dashboard/components"),
      roles: ["admin", "manager"],
    },
    {
      name: "Prompts",
      href: "/dashboard/prompts",
      icon: Zap,
      current: pathname.startsWith("/dashboard/prompts"),
      roles: ["admin"],
    },
    {
      name: "LLM Gateway",
      href: "/dashboard/genai-route",
      icon: Route,
      current: pathname.startsWith("/dashboard/genai-route"),
      roles: ["admin"],
    },
  ];

  const visibleNav = navigation.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setLoggingOut(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return {
          bg: "bg-white/5 text-neutral-300 border-neutral-700",
          icon: Shield,
          label: "Admin",
        };

      case "manager":
        return {
          bg: "bg-neutral-800 text-neutral-300 border-neutral-700",
          icon: Briefcase,
          label: "Manager",
        };

      default:
        return {
          bg: "bg-neutral-900 text-neutral-400 border-neutral-800",
          icon: User,
          label: "Public User",
        };
    }
  };

  const roleInfo = getRoleBadge(user.role);
  const RoleIcon = roleInfo.icon;

  const mainNav = visibleNav.filter((n) =>
    ["Dashboard", "Chatbot", "Chat History", "LLM Gateway"].includes(n.name)
  );

  const adminNav = visibleNav.filter((n) =>
    ["Users"].includes(n.name)
  );

  const contentNav = visibleNav.filter((n) =>
    ["Knowledge Base", "Components", "Prompts"].includes(n.name)
  );

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row text-neutral-100">

      {/* Mobile Top Header */}
      <div
        className="
          md:hidden sticky top-0 z-40
          flex items-center justify-between
          px-4 py-3
          bg-[#080808]
          border-b border-neutral-900
          backdrop-blur-xl
        "
      >
        <div className="flex items-center gap-2.5">
          <div
            className="
              flex items-center justify-center
              w-9 h-9
              rounded-xl
              bg-white
              text-black
            "
          >
            <Bot className="w-5 h-5" />
          </div>

          <span className="font-semibold text-white text-sm tracking-tight">
            GenAI Chatbot
          </span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="
            p-2 rounded-lg
            text-neutral-500
            hover:text-white
            hover:bg-neutral-900
            transition-all
            focus:outline-none
          "
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky
          top-0 inset-y-0 left-0
          z-50
          w-64
          bg-[#080808]
          md:bg-[#080808]
          border-r border-neutral-900
          flex flex-col justify-between
          transition-transform duration-200 ease-in-out
          h-screen
          ${mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">

          {/* Brand */}
          <div
            className="
              px-5 py-5
              border-b border-neutral-900
              flex items-center justify-between
              shrink-0
            "
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group focus:outline-none"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                className="
                  flex items-center justify-center
                  w-9 h-9
                  rounded-xl
                  bg-white
                  text-black
                  transition-transform
                  group-hover:scale-105
                "
              >
                <Bot className="w-5 h-5" />
              </div>

              <div>
                <h2 className="font-semibold text-sm text-white tracking-tight">
                  GenAI Chatbot
                </h2>

                <p className="text-[10px] text-neutral-600 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-neutral-500" />
                  v1.1 Management Suite
                </p>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="
                md:hidden
                p-1.5
                text-neutral-500
                hover:text-white
                rounded-lg
                hover:bg-neutral-900
                transition-all
              "
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">

            {/* Main */}
            {mainNav.length > 0 && (
              <div>
                <div
                  className="
                    px-2 pb-2
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-neutral-600
                  "
                >
                  Menu
                </div>

                {mainNav.map((item) => (
                  <NavLink
                    key={item.name}
                    item={item}
                    onClose={() => setMobileMenuOpen(false)}
                  />
                ))}
              </div>
            )}

            {/* Admin */}
            {adminNav.length > 0 && (
              <div>
                <div
                  className="
                    px-2 pb-2
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-neutral-600
                  "
                >
                  Manajemen
                </div>

                {adminNav.map((item) => (
                  <NavLink
                    key={item.name}
                    item={item}
                    onClose={() => setMobileMenuOpen(false)}
                  />
                ))}
              </div>
            )}

            {/* Content & Config */}
            {contentNav.length > 0 && (
              <div>
                <div
                  className="
                    px-2 pb-2
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-neutral-600
                  "
                >
                  Konfigurasi
                </div>

                {contentNav.map((item) => (
                  <NavLink
                    key={item.name}
                    item={item}
                    onClose={() => setMobileMenuOpen(false)}
                  />
                ))}
              </div>
            )}
          </nav>

          {/* User Footer */}
          <div
            className="
              p-3
              border-t border-neutral-900
              bg-black
              shrink-0
            "
          >
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div
                className="
                  flex items-center justify-center
                  w-9 h-9
                  rounded-full
                  bg-neutral-800
                  border border-neutral-700
                  font-semibold
                  text-white
                  text-sm
                  shrink-0
                "
              >
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>

              <div className="overflow-hidden flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {user.name}
                </p>

                <p className="text-[11px] text-neutral-600 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-1">
              <span
                className={`
                  inline-flex items-center gap-1
                  text-[10px]
                  font-medium
                  px-2 py-1
                  rounded-md
                  border
                  ${roleInfo.bg}
                `}
              >
                <RoleIcon className="w-2.5 h-2.5" />
                {roleInfo.label}
              </span>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="
                  inline-flex items-center gap-1
                  text-xs
                  text-neutral-500
                  hover:text-white
                  hover:bg-neutral-900
                  px-2 py-1
                  rounded-lg
                  transition-all
                  cursor-pointer
                "
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />

                <span>
                  {loggingOut ? "..." : "Keluar"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen bg-black">
        <div className="flex-1 p-5 md:p-7 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({
  item,
  onClose,
}: {
  item: NavItem;
  onClose: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`
        flex items-center justify-between
        px-3 py-2.5
        rounded-xl
        text-xs
        font-medium
        transition-all
        group
        mb-0.5
        ${item.current
          ? `
              bg-white
              text-black
              shadow-sm
            `
          : `
              text-neutral-500
              hover:text-white
              hover:bg-neutral-900
            `
        }
      `}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={`
            w-4 h-4
            transition-colors
            ${item.current
              ? "text-black"
              : "text-neutral-600 group-hover:text-neutral-300"
            }
          `}
        />

        <span>{item.name}</span>
      </div>

      {item.badge ? (
        <span
          className={`
            text-[9px]
            px-1.5 py-0.5
            rounded-md
            font-medium
            ${item.current
              ? "bg-black/10 text-black"
              : "bg-neutral-900 text-neutral-500 border border-neutral-800"
            }
          `}
        >
          {item.badge}
        </span>
      ) : item.current ? (
        <ChevronRight className="w-3 h-3 text-black/50" />
      ) : null}
    </Link>
  );
}