import { clientCheckInAction } from "@/app/actions";
import { CheckInForm } from "@/components/forms";

export default function ClientCheckInPage() {
  return (
    <main className="container stack">
      <h1>Weekly Check-In</h1>
      <CheckInForm action={clientCheckInAction} />
    </main>
  );
}

