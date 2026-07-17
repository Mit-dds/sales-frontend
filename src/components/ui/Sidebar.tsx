import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useSidebar } from "@/app/providers/SidebarProvider";
import { usersService } from "@/services/users.service";
import type { UserRole } from "@/types";
import { X } from "lucide-react";
import { useEffect } from "react";

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

const adminNav: NavItem[] = [
  { id: "projects", path: "/projects", label: "Projects", icon: "P" },
  {
    id: "availability",
    path: "/availability",
    label: "Availability",
    icon: "A",
  },
  { id: "users", path: "/users", label: "Users", icon: "U" },
  { id: "history", path: "/history", label: "Offer History", icon: "H" },
  { id: "settings", path: "/settings", label: "Settings", icon: "S" },
  { id: "profile", path: "/profile", label: "My Profile", icon: "Me" },
];

const agentNav: NavItem[] = [
  { id: "offers", path: "/offers", label: "New Offer", icon: "N" },
  { id: "history", path: "/history", label: "My Offers", icon: "H" },
  { id: "profile", path: "/profile", label: "My Profile", icon: "Me" },
];

function navItems(role: UserRole): NavItem[] {
  return role === "admin" ? adminNav : agentNav;
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { open, setOpen } = useSidebar();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const pendingCount = usersService
    .getAll()
    .filter((u) => !u.approved && u.role === "agent").length;
  const items = navItems(user?.role ?? "agent").map((item) =>
    item.id === "users" ? { ...item, badge: pendingCount } : item,
  );

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const sidebarContent = (
    <nav>
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <div
            key={item.id}
            onClick={() => handleNav(item.path)}
            className={`flex items-center gap-2.5 px-5 py-[11px] cursor-pointer text-[13px]
              ${
                active
                  ? "bg-gold-dim text-gold font-semibold border-l-[3px] border-gold"
                  : "text-navy-light border-l-[3px] border-transparent"
              }`}
          >
            <span
              className={`text-sm w-5 text-center flex-shrink-0 ${active ? "text-gold" : "text-navy-dim"}`}
            >
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:flex w-[210px] bg-[#EEF2FA] border-r border-border py-5 flex-shrink-0 flex-col">
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-[260px] h-full bg-[#EEF2FA] border-r border-border py-5 flex flex-col shadow-xl overflow-y-auto animate-slide-in-left">
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border mb-3">
              <div className="font-serif text-lg font-bold text-gold">Reportage</div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-surface cursor-pointer text-navy-dim">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
