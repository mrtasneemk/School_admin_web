import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { changePassword } from "../api/auth";
import PageHeader from "../components/ui/PageHeader";
import Alert from "../components/ui/Alert";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (msg) => {
      setSuccess(msg);
      setError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    },
    onError: (err: unknown) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Failed to change password.");
    }
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword) {
      setError("Please fill all fields.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    mutation.mutate({ currentPassword, newPassword });
  }

  return (
    <section className="grid" style={{ maxWidth: 780 }}>
      <PageHeader title="Change Password" description="Update your account password." />

      <form className="card" onSubmit={onSubmit}>
        <div className="grid" style={{ gap: 12 }}>
          <div>
            <label className="label">Current Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <div className="help">Choose a strong password. Avoid reusing old passwords.</div>
          </div>
        </div>

        {error && <Alert tone="danger" title="Update Failed">{error}</Alert>}
        {success && <Alert tone="success" title="Password Updated">{success}</Alert>}

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </section>
  );
}
