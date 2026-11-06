import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import "./auth-gate.css";

type Props = { children: ReactNode };
type Mode = "signin" | "signup" | "reset";

type NexusAuthState = { signedIn:boolean; guest:boolean };
const NexusAuthContext = createContext<NexusAuthState>({ signedIn:false, guest:false });
export const useNexusAuth = () => useContext(NexusAuthContext);

export function AuthGate({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [guest, setGuest] = useState(() => localStorage.getItem("nexus-guest-mode") === "true");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      setSignedIn(Boolean(data.session));
      if (error) setMessage(error.message);
    }).catch((error: unknown) => {
      if (!alive) return;
      setMessage(error instanceof Error ? error.message : "Couldn't check your saved session. You can still continue as a guest.");
    }).finally(() => {
      if (alive) setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      if (session) { localStorage.removeItem("nexus-guest-mode"); setGuest(false); }
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const openSignIn = () => {
      localStorage.removeItem("nexus-guest-mode");
      setGuest(false);
      setMode("signin");
      setMessage("Sign in or create an account to use creator features.");
    };
    window.addEventListener("nexus:require-auth", openSignIn);
    return () => window.removeEventListener("nexus:require-auth", openSignIn);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) { setMessage("Supabase isn't connected in this environment yet. Add the Project URL and publishable key."); return; }
    setBusy(true); setMessage("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage("Password reset email sent. Check your inbox.");
      } else if (mode === "signup") {
        const cleanEmail = email.trim().toLowerCase();
        const cleanDisplayName = displayName.trim().slice(0, 60) || cleanEmail.split("@")[0];
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { data: { display_name: cleanDisplayName }, emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        setMessage(data.session ? "Account created. Welcome to NEXUS!" : "Account created. Check your email to confirm your address. Open the confirmation link on this same NEXUS website.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication could not be completed.");
    } finally { setBusy(false); }
  };

  const googleSignIn = async () => {
    if (!supabase) { setMessage("Connect Supabase first to enable Google sign-in."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in could not be started.");
      setBusy(false);
    }
  };

  const continueAsGuest = () => { localStorage.setItem("nexus-guest-mode", "true"); setGuest(true); };
  const returnToAccount = () => { localStorage.removeItem("nexus-guest-mode"); setGuest(false); };
  const signOut = async () => {
    if (!supabase) { setSignedIn(false); return; }
    const { error } = await supabase.auth.signOut();
    if (error) { setMessage(error.message); return; }
    setSignedIn(false);
    setMessage("");
  };
  if (!ready) return <div className="nexus-auth-loading"><div className="nexus-auth-mark">N</div><span>Preparing your creative space…</span></div>;
  if (signedIn) return <NexusAuthContext.Provider value={{signedIn,guest:false}}>{children}<button className="nexus-auth-access" onClick={signOut}>Sign out</button></NexusAuthContext.Provider>;
  if (guest) return <NexusAuthContext.Provider value={{signedIn:false,guest:true}}>{children}<button className="nexus-auth-access" onClick={returnToAccount}>Sign in / Create account</button></NexusAuthContext.Provider>;

  const configured = isSupabaseConfigured;
  return <main className="nexus-auth-screen"><section className="nexus-auth-card">
    <div className="nexus-auth-brand"><span className="nexus-auth-mark">N</span><span>NEXUS <b>STUDIO</b></span></div>
    <div className="nexus-auth-eyebrow">YOUR CREATIVE WORLD</div>
    <h1>{mode === "signup" ? "Create your space." : mode === "reset" ? "Reset your password." : "Create without limits."}</h1>
    <p className="nexus-auth-intro">Edit, create and share your ideas with the NEXUS creator community.</p>
    {mode !== "reset" && <div className="nexus-auth-socials">
      <button type="button" onClick={googleSignIn} disabled={!configured || busy}>Continue with Google</button>
    </div>}
    <div className="nexus-auth-divider"><span>or use email</span></div>
    <form className="nexus-auth-form" onSubmit={submit}>
      {mode === "signup" && <label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your creator name" autoComplete="name" /></label>}
      <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
      {mode !== "reset" && <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></label>}
      <button className="nexus-auth-primary" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</button>
    </form>
    {mode === "signin" && <button className="nexus-auth-text-button" onClick={() => { setMode("reset"); setMessage(""); }}>Forgot password?</button>}
    <div className="nexus-auth-switch">{mode === "reset" ? <button onClick={() => setMode("signin")}>Back to sign in</button> : mode === "signup" ? <>Already have an account? <button onClick={() => setMode("signin")}>Sign in</button></> : <>New to NEXUS? <button onClick={() => setMode("signup")}>Create account</button></>}</div>
    {message && <p className="nexus-auth-message" role="status">{message}</p>}
    {!configured && <p className="nexus-auth-note">Add your NEXUS Supabase Project URL and publishable key to enable accounts in this environment.</p>}
    <button className="nexus-auth-guest" onClick={continueAsGuest}>Explore as a guest <span>→</span></button>
    <p className="nexus-auth-legal">Guest browsing is open. Sign in to publish, follow, like, comment and save.</p>
  </section></main>;
}
