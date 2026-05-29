import { logoutAction } from "@/app/actions";

export default function LogoutPage() {
  return (
    <main className="login">
      <form action={logoutAction} className="card form">
        <h1>Ready to log out?</h1>
        <button className="button primary" type="submit">
          Logout
        </button>
      </form>
    </main>
  );
}

