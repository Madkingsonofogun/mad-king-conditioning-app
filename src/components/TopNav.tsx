import Link from "next/link";
import Image from "next/image";
import { BookOpen, CalendarDays, Dumbbell, Home, Library, LogOut, MessageCircle, Settings, UserRound, UsersRound } from "lucide-react";

export function TopNav({ role }: { role: "admin" | "coach" | "client" }) {
  const links =
    role === "admin"
      ? [
          ["/admin/dashboard", "Dashboard", Home],
          ["/admin/schedule", "Schedule", CalendarDays],
          ["/admin/clients", "Clients", UsersRound],
          ["/admin/coaches", "Coaches", UserRound],
          ["/admin/chats", "Chats", MessageCircle],
          ["/admin/exercise-library", "Exercises", Dumbbell],
          ["/admin/plan-templates", "Templates", BookOpen],
          ["/admin/settings", "Settings", Settings]
        ]
      : role === "coach"
        ? [
            ["/admin/dashboard", "Dashboard", Home],
            ["/admin/schedule", "Schedule", CalendarDays],
            ["/admin/clients", "Clients", UsersRound],
            ["/admin/exercise-library", "Exercises", Dumbbell]
          ]
      : [
          ["/client/dashboard", "Dashboard", Home],
            ["/client/profile", "Profile", UserRound],
            ["/client/workouts", "Workouts", Dumbbell],
            ["/client/monthly-plan", "Plan", CalendarDays],
            ["/client/assessments", "Assessments", BookOpen],
            ["/client/check-in", "Check-In", MessageCircle],
            ["/client/chat", "Chat", MessageCircle],
            ["/client/notes", "Notes", Library]
          ];
  const mobileLinks = links.slice(0, 5);

  return (
    <>
      <header className="mobile-topbar">
        <Link className="brand split" href={role === "client" ? "/client/dashboard" : "/admin/dashboard"}>
          <Image className="brand-icon" src="/mad-king-conditioning.png" alt="Mad King Conditioning" width={42} height={42} priority />
          <span>Mad King Conditioning</span>
        </Link>
        <Link className="icon-link" href="/logout" aria-label="Logout">
          <LogOut size={18} />
        </Link>
      </header>
      <aside className="sidebar">
        <Link className="brand sidebar-brand" href={role === "client" ? "/client/dashboard" : "/admin/dashboard"}>
          <Image className="brand-icon" src="/mad-king-conditioning.png" alt="Mad King Conditioning" width={46} height={46} priority />
          <span>Mad King Conditioning</span>
        </Link>
        <nav className="side-nav">
          {links.map(([href, label, Icon]) => (
            <Link key={href as string} href={href as string}>
              <Icon size={18} />
              {label as string}
            </Link>
          ))}
        </nav>
        <Link className="logout-link" href="/logout">
          <LogOut size={18} />
          Logout
        </Link>
      </aside>
      <nav className="bottom-nav">
        {mobileLinks.map(([href, label, Icon]) => (
          <Link key={href as string} href={href as string}>
            <Icon size={18} />
            <span>{label as string}</span>
          </Link>
        ))}
      </nav>
    </>
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
