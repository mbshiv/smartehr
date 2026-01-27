import { FileText, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "./UserMenu";

interface SidebarProps {
  activeModule: "documentation" | "billing";
  onModuleChange: (module: "documentation" | "billing") => void;
}

const Sidebar = ({ activeModule, onModuleChange }: SidebarProps) => {
  const navItems = [
    {
      id: "documentation" as const,
      label: "Documentation Assistant",
      icon: FileText,
      description: "AI-powered clinical notes",
    },
    {
      id: "billing" as const,
      label: "Billing Validator",
      icon: DollarSign,
      description: "Coding & claim validation",
    },
  ];

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg healthcare-gradient flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">NextGenEHR</h1>
            <p className="text-xs text-sidebar-foreground/60">AI-Powered Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-3">
          AI Modules
        </p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onModuleChange(item.id)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 text-left group",
              activeModule === item.id
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5 mt-0.5 transition-colors",
                activeModule === item.id
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
              )}
            />
            <div>
              <span className="font-medium text-sm">{item.label}</span>
              <p
                className={cn(
                  "text-xs mt-0.5 transition-colors",
                  activeModule === item.id
                    ? "text-sidebar-primary-foreground/80"
                    : "text-sidebar-foreground/50"
                )}
              >
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </nav>

      {/* User Menu & Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-sidebar-foreground/60">Account</span>
          <UserMenu />
        </div>
        <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <p className="text-xs text-sidebar-foreground/60">
            Demo Mode • Synthetic Data Only
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
