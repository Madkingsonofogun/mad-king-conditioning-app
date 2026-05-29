import Link from "next/link";
import Image from "next/image";
import { LogOut, UserRound } from "lucide-react";

export function TopNav({ role }: { role: "admin" | "coach" | "client" }) {
  const links =
    role === "admin"
      ? [
          ["/admin/dashboard", "Dashboard"],
          ["/admin/schedule", "Schedule"],
          ["/admin/clients", "Clients"],
          ["/admin/coaches", "Coaches"],
          ["/admin/chats", "Chats"],
          ["/admin/exercise-library", "Exercises"],
          ["/admin/plan-templates", "Templates"],
          ["/admin/settings", "Settings"]
        ]
      : role === "coach"
        ? [
            ["/admin/dashboard", "Dashboard"],
            ["/admin/schedule", "Schedule"],
            ["/admin/clients", "Clients"],
            ["/admin/exercise-library", "Exercises"]
          ]
      : [
          ["/client/dashboard", "Dashboard"],
            ["/client/profile", "Profile"],
            ["/client/workouts", "Workouts"],
            ["/client/monthly-plan", "Plan"],
            ["/client/assessments", "Assessments"],
            ["/client/check-in", "Check-In"],
            ["/client/chat", "Chat"],
            ["/client/notes", "Notes"]
          ];

  return (
    <header className="topbar">
      <Link className="brand split" href={role === "client" ? "/client/dashboard" : "/admin/dashboard"}>
        <Image className="brand-icon" src="/mad-king-conditioning.png" alt="Mad King Conditioning" width={42} height={42} priority />
        <span>Mad King Conditioning</span>
      </Link>
      <nav className="nav">
        {links.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
        <Link href="/logout">
          <LogOut size={16} />
          Logout
        </Link>
      </nav>
    </header>
  );
}

export function ClientBadge({ name }: { name: string }) {
  return (
    <span className="split muted">
      <UserRound size={16} />
      {name}
    </span>
  );
}
