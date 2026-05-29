import { createCoachAction, deleteCoachAction, updateCoachPasswordAction, updateCoachProfileImageAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export default async function CoachesPage({ searchParams }: { searchParams: { error?: string; updated?: string } }) {
  await requireAdmin();
  const coaches = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "COACH"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });

  const message =
    searchParams.updated === "pin"
      ? "Coach PIN updated."
      : searchParams.error === "exists"
      ? "That coach name or email already exists."
      : searchParams.error === "pin"
        ? "Coach name is required and PIN must be 4 to 8 numbers."
        : searchParams.error === "self"
          ? "You cannot remove the admin account you are currently using."
        : searchParams.error === "image"
          ? "Please choose a coach image."
          : null;

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>Coaches</h1>
          <p>Only an admin can create coach logins. Coaches sign in with their coach name and numeric PIN.</p>
        </div>
      </div>

      <form className="card form" action={createCoachAction}>
        <h2>Add Coach Login</h2>
        {message ? <p className="label draft">{message}</p> : null}
        <div className="grid">
          <label className="field">
            <span>Coach Name</span>
            <input name="name" required placeholder="Coach Mike" />
          </label>
          <label className="field">
            <span>Numeric PIN</span>
            <input name="pin" inputMode="numeric" pattern="[0-9]{4,8}" required placeholder="2468" />
          </label>
          <label className="field">
            <span>Email Optional</span>
            <input name="email" type="email" placeholder="coach@example.com" />
          </label>
        </div>
        <button className="button primary" type="submit">
          Create Coach
        </button>
      </form>

      <section className="card">
        <h2>Coach/Admin Accounts</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                  <th>Login Style</th>
                  <th>Change PIN</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach) => (
                  <tr key={coach.id}>
                    <td>
                      <div className="stack">
                        {coach.profileImageUrl ? (
                          <img className="avatar" src={coach.profileImageUrl} alt={`${coach.name} profile`} />
                        ) : (
                          <div className="avatar placeholder">{coach.name.slice(0, 1)}</div>
                        )}
                        <form className="form" action={updateCoachProfileImageAction.bind(null, coach.id)}>
                          <input name="coachImage" type="file" accept="image/*" capture="environment" required />
                          <button className="button" type="submit">Update Image</button>
                        </form>
                      </div>
                    </td>
                    <td>{coach.name}</td>
                    <td>{coach.role}</td>
                    <td>{coach.email}</td>
                    <td>{coach.role === "ADMIN" ? "PIN only" : "Coach name + PIN"}</td>
                    <td>
                      <form className="form" action={updateCoachPasswordAction.bind(null, coach.id)}>
                        <input name="pin" inputMode="numeric" pattern="[0-9]{4,8}" required placeholder="New 4-8 digit PIN" />
                        <button className="button primary" type="submit">Update PIN</button>
                      </form>
                    </td>
                    <td>
                      <form action={deleteCoachAction.bind(null, coach.id)}>
                        <button className="button" type="submit">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
