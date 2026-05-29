import { signupAction } from "@/app/actions";
import Image from "next/image";
import Link from "next/link";

const sportFocusOptions = ["Boxing", "Kickboxing", "BJJ", "Fight Conditioning", "General Fitness", "Strength", "Weight Loss"];
const goalOptions = ["Conditioning", "Strength and Conditioning", "Strength", "Weight Loss", "General Fitness", "Return to Training"];

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  const message =
    searchParams.error === "exists"
      ? "An account already exists for that email."
      : searchParams.error
        ? "Please enter your name, email, and a password with at least 6 characters."
        : null;

  return (
    <main className="login">
      <form className="card form" action={signupAction}>
        <div>
          <Image className="login-logo" src="/mad-king-conditioning.png" alt="Mad King Conditioning" width={180} height={180} priority />
          <h1>Create Client Account</h1>
          <p>Sign up for your Mad King Conditioning client dashboard. Your coach can assign your package and workouts after review.</p>
        </div>
        {message ? <p className="label draft">{message}</p> : null}
        <label className="field">
          <span>Name</span>
          <input name="name" required placeholder="Your full name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" minLength={6} required placeholder="At least 6 characters" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" placeholder="Phone number" />
        </label>
        <div className="grid">
          <label className="field">
            <span>Sport Focus</span>
            <select name="sportFocus" defaultValue="General Fitness">
              {sportFocusOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Goal</span>
            <select name="goal" defaultValue="General Fitness">
              {goalOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Training Days</span>
            <select name="trainingDaysPerWeek" defaultValue="3">
              {["2", "3", "4", "5"].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Session Length</span>
            <select name="sessionLength" defaultValue="60">
              {["30", "45", "60"].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <section className="form">
          <h2>Schedule First Assessment</h2>
          <p>Your coach will do the first assessment with you. Pick a preferred time so they can confirm it.</p>
          <div className="grid">
            <label className="field">
              <span>Preferred Date</span>
              <input name="assessmentDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
            <label className="field">
              <span>Preferred Time</span>
              <input name="assessmentTime" type="time" required defaultValue="09:00" />
            </label>
          </div>
          <label className="field">
            <span>Notes for Coach</span>
            <textarea name="assessmentNotes" placeholder="Anything your coach should know before your first assessment?" />
          </label>
        </section>
        <button className="button primary" type="submit">
          Sign Up
        </button>
        <Link className="button" href="/login">
          Back to Login
        </Link>
      </form>
    </main>
  );
}
