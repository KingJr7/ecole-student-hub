
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Book, CalendarCheck, FileText, FileMinus, Users, GraduationCap, Database, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: Book },
    { name: "Élèves", href: "/students", icon: Users },
    { name: "Professeurs", href: "/teachers", icon: GraduationCap },
    { name: "Classes", href: "/classes", icon: Database },

    { name: "Présences", href: "/attendance", icon: CalendarCheck },
    { name: "Paiements", href: "/payments", icon: FileMinus },
    { name: "Notes", href: "/grades", icon: FileText },
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div
      className={cn(
        "bg-sidebar h-screen flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <h1 className="text-sidebar-foreground font-bold text-xl">Ntik</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? ">" : "<"}
        </Button>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto py-4">
        <nav className="flex-1 space-y-1 px-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                location.pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 h-5 w-5",
                  location.pathname === item.href
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground"
                )}
                aria-hidden="true"
              />
              {!collapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border text-sidebar-foreground text-xs flex flex-col gap-2">
        <Link
          to="/settings"
          className={cn(
            "group flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-sidebar-accent hover:text-sidebar-foreground",
            location.pathname === "/settings" ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground"
          )}
        >
          <SettingsIcon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
          {!collapsed && <span className="ml-3">Paramètres</span>}
        </Link>
        {!collapsed && <div>© Ntik {new Date().getFullYear()}</div>}
      </div>
    </div>
  );
}
