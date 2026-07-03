import React, { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "./supabaseClient";

const page = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#F1F2F6",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  padding: 16,
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div style={page}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#FFFFFF",
          border: "1px solid #E3E5EC",
          borderRadius: 20,
          padding: "32px 28px",
          width: "100%",
          maxWidth: 340,
          boxShadow: "0 8px 24px rgba(20,22,28,0.06)",
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: "#3730A3",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <Lock size={17} color="#fff" />
        </div>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>
          Planner
        </h1>
        <p style={{ fontSize: 13, color: "#6B7080", margin: "0 0 22px" }}>
          Sign in to your personal planner.
        </p>

        <label style={{ fontSize: 11, fontWeight: 600, color: "#9498A6", letterSpacing: "0.04em", textTransform: "uppercase" }}>Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          style={{
            display: "block", width: "100%", marginTop: 6, marginBottom: 14, padding: "10px 12px",
            borderRadius: 10, border: "1px solid #E3E5EC", fontSize: 14, outline: "none", boxSizing: "border-box",
          }}
        />

        <label style={{ fontSize: 11, fontWeight: 600, color: "#9498A6", letterSpacing: "0.04em", textTransform: "uppercase" }}>Password</label>
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{
            display: "block", width: "100%", marginTop: 6, marginBottom: 18, padding: "10px 12px",
            borderRadius: 10, border: "1px solid #E3E5EC", fontSize: 14, outline: "none", boxSizing: "border-box",
          }}
        />

        {error && (
          <p style={{ fontSize: 12.5, color: "#DC4C4C", marginTop: -6, marginBottom: 14 }}>{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
            background: "#3730A3", color: "#fff", fontSize: 14, fontWeight: 600,
            opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ fontSize: 11.5, color: "#9498A6", marginTop: 16, marginBottom: 0, lineHeight: 1.5 }}>
          This planner has one account: yours. Create or reset it from your
          Supabase project's Authentication → Users panel.
        </p>
      </form>
    </div>
  );
}
