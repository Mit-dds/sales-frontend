import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { usersService } from "@/services/users.service";
import type { UserRole } from "@/types";

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
  const pendingCount = usersService
    .getAll()
    .filter((u) => !u.approved && u.role === "agent").length;
  const items = navItems(user?.role ?? "agent").map((item) =>
    item.id === "users" ? { ...item, badge: pendingCount } : item,
  );

  return (
    <aside className="w-[210px] bg-[#EEF2FA] border-r border-border py-5 flex-shrink-0">
      <nav>
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <div
              key={item.id}
              onClick={() => navigate(item.path)}
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
              {/* {item.badge && item.badge > 0 && (
                <span className="text-[9px] bg-orange-dim text-orange border border-[rgba(200,100,10,0.3)] rounded px-2 py-0.5 font-mono ml-auto">
                  {item.badge}
                </span>
              )} */}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
