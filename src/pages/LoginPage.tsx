import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (!data.token) {
        setError("Login response did not include a token.");
        return;
      }

      // Drop cached data from any previous user/session before switching auth.
      qc.clear();
      loginWithToken(data.token);
      navigate("/");
    },
    onError: (err) => {
      const axiosErr = err as AxiosError<{ message?: string; title?: string }>;
      const apiMessage =
        axiosErr.response?.data?.message ??
        axiosErr.response?.data?.title ??
        axiosErr.message;
      setError(apiMessage || "Invalid credentials or server error.");
    }
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate({ username, password });
  }

  return (
    <div className="login-shell">
      <div className="login-grid">
        <div className="hero">
          <h1>School ERP</h1>
          <p>
            Modern, role-gated administration for employees, academics, and communication.
            Sign in to continue. Administrator features will appear automatically based on your role.
          </p>
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="chip">Secure JWT</span>
            <span className="chip">Role-based access</span>
            <span className="chip">Dark mode</span>
            <span className="chip">Responsive UI</span>
          </div>
        </div>

        <form className="panel login-card" onSubmit={onSubmit}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Sign in</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>
              Use your ERP credentials.
            </p>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <div className="help">You will see modules based on your role.</div>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
