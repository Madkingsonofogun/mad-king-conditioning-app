import { loginAction } from "@/app/actions";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="login">
      <form className="card form" action={loginAction}>
        <div>
          <Image className="login-logo" src="/mad-king-conditioning.png" alt="Mad King Conditioning" width={180} height={180} priority />
          <h1>Mad King Conditioning</h1>
          <p>Sign in to your coach command center or client training dashboard.</p>
        </div>
        {searchParams.error ? <p className="label draft">Email or password did not match.</p> : null}
        <label className="field">
          <span>Coach Name or Client Email</span>
          <input name="identifier" placeholder="Coach Mike or marcus@example.com" />
        </label>
        <label className="field">
          <span>PIN or Password</span>
          <input name="password" type="password" inputMode="numeric" required placeholder="Admin PIN, coach PIN, or client password" />
        </label>
        <p className="muted">Admin login uses the number only. Leave the name/email blank and enter the admin PIN.</p>
        <button className="button primary" type="submit">
          Log In
        </button>
        <Link className="button" href="/signup">
          Create Client Account
        </Link>
      </form>
    </main>
  );
}
