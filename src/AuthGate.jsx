import React, { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import Login from "./Login";

const centerPage = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#F1F2F6", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", padding: 24,
};

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
