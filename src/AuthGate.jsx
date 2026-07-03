import React, { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import Login from "./Login";

const centerPage = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#F1F2F6", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", padding: 24,
};

function ConfigMissing() {
  const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);

  return (
    <div style={centerPage}>
      <div style={{ maxWidth: 420, background: "#fff", border: "1px solid #E3E5EC", borderRadius: 16, padding: 24 }}>
        <AlertTriangle size={20} color="#DC4C4C" />
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 18, margin: "10px 0 6px" }}>Supabase isn't configured yet</h2>
        <p style={{ fontSize: 13.5, color: "#6B7080", lineHeight: 1.6, margin: 0 }}>
          {isLocal ? (
            <>
              Copy <code>.env.example</code> to <code>.env</code>, add <code>VITE_SUPABASE_URL</code> and
              <code> VITE_SUPABASE_ANON_KEY</code>, then stop and restart <code>npm run dev</code>.
            </>
          ) : (
            <>
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your host's
              environment variables, or use Supabase's <code>NEXT_PUBLIC_SUPABASE_URL</code> and
              <code> NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> names, then redeploy.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={centerPage}>
      <span style={{ fontSize: 13, color: "#9498A6" }}>Loading…</span>
    </div>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return children({ id: "local-only", email: "Local only", isLocalOnly: true });
  if (session === undefined) return <LoadingScreen />;
  if (!session) return <Login />;
  return children(session.user);
}
