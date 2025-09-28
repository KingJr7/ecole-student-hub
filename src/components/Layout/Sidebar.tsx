
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Book, CalendarCheck, FileText, FileMinus, Users, GraduationCap, Database, Settings as SettingsIcon, LogOut, BarChart, DollarSign, Megaphone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { hasPermission, PERMISSIONS } from "../../lib/permissions";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null; // Ne rien afficher si l'utilisateur n'est pas connecté

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: Book, permission: PERMISSIONS.CAN_MANAGE_STUDENTS }, // Visible par défaut
    { name: "Élèves", href: "/students", icon: Users, permission: PERMISSIONS.CAN_MANAGE_STUDENTS },
    { name: "Professeurs", href: "/teachers", icon: GraduationCap, permission: PERMISSIONS.CAN_MANAGE_TEACHERS },
    { name: "Personnel", href: "/employees", icon: Users, permission: PERMISSIONS.CAN_MANAGE_EMPLOYEES },
    { name: "Cahier de Pointage", href: "/employee-attendance", icon: Clock, permission: PERMISSIONS.CAN_MANAGE_EMPLOYEE_ATTENDANCE },
    { name: "Classes", href: "/classes", icon: Database, permission: PERMISSIONS.CAN_MANAGE_CLASSES },
    { name: "Emploi du temps", href: "/schedules", icon: CalendarCheck, permission: PERMISSIONS.CAN_MANAGE_SCHEDULES },
    { name: "Présences", href: "/attendance", icon: CalendarCheck, permission: PERMISSIONS.CAN_MANAGE_ATTENDANCE },
    { name: "Paiements", href: "/payments", icon: FileMinus, permission: PERMISSIONS.CAN_MANAGE_PAYMENTS },
    { name: "Notes", href: "/grades", icon: FileText, permission: PERMISSIONS.CAN_MANAGE_GRADES },
    { name: "Performance par classe", href: "/class-performance", icon: BarChart, permission: PERMISSIONS.CAN_MANAGE_CLASSES },
    { name: "Finances", href: "/finance", icon: DollarSign, permission: PERMISSIONS.CAN_MANAGE_PAYMENTS },
    { name: "Événements", href: "/events", icon: Megaphone, permission: PERMISSIONS.CAN_MANAGE_EVENTS },
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
          {navigation.map((item) => 
            hasPermission(user.role, user.permissions, item.permission) && (
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
            )
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border text-sidebar-foreground text-xs flex flex-col gap-2">
        {hasPermission(user.role, user.permissions, PERMISSIONS.CAN_MANAGE_SETTINGS) && (
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
        )}
        <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-left hover:bg-red-500">
          <LogOut className="mr-3 h-5 w-5" />
          {!collapsed && <span className="ml-3">Déconnexion</span>}
        </Button>
        {!collapsed && <div>© Ntik {new Date().getFullYear()}</div>}
      </div>
    </div>
  );
}
