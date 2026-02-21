import { useState } from "react";
import { logIn, signUp } from "./firebase.js";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
    Chat: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>),
};

export default function AuthPage({ onLoginSuccess, initialMode = "login" }) {
    const [mode, setMode] = useState(initialMode); // "login" or "signup"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await logIn(email, password);
            onLoginSuccess();
        } catch (err) {
            setError(err.message.replace("Firebase: ", ""));
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await signUp(email, password);
            alert("Account created! Please login.");
            setMode("login");
            setPassword(""); // Clear password for login
        } catch (err) {
            setError(err.message.replace("Firebase: ", ""));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "24px", position: "relative", overflow: "hidden" }}>
            {/* Background glow effects */}
            <div style={{ position: "absolute", top: "20%", left: "20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.06), transparent)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "20%", right: "20%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.04), transparent)", pointerEvents: "none" }} />

            <div style={{ maxWidth: "420px", width: "100%", background: "var(--surface)", padding: "48px 40px", borderRadius: "24px", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", position: "relative", zIndex: 1 }} className="fade-in">

                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <div style={{ display: "inline-flex", padding: "12px", borderRadius: "12px", background: "rgba(245,158,11,0.1)", color: "var(--accent)", marginBottom: "16px" }}>
                        <Icons.Chat />
                    </div>
                    <h2 style={{ fontSize: "32px", fontWeight: 900, fontFamily: "var(--font-display)", color: "var(--fg)", marginBottom: "8px" }}>
                        {mode === "login" ? "Welcome Back" : "Create Account"}
                    </h2>
                    <p style={{ color: "var(--fg-muted)", fontSize: "14px" }}>
                        {mode === "login" ? "Login to your PaperCast account" : "Join the Paper to Podcast community"}
                    </p>
                </div>

                <form onSubmit={mode === "login" ? handleLogin : handleSignup} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--fg-muted)", marginBottom: "8px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>EMAIL ADDRESS</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={{ width: "100%", padding: "14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--fg)", outline: "none", fontSize: "14px", transition: "border-color 0.2s" }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--fg-muted)", marginBottom: "8px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>PASSWORD</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: "14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--fg)", outline: "none", fontSize: "14px" }} />
                    </div>

                    {error && <p style={{ color: "var(--red)", fontSize: "13px", textAlign: "center" }}>{error}</p>}

                    <button type="submit" disabled={loading} style={{
                        padding: "16px", background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                        color: "#000", border: "none", borderRadius: "14px", fontSize: "16px", fontWeight: 700,
                        cursor: loading ? "wait" : "pointer", marginTop: "10px", boxShadow: "0 4px 15px rgba(245,158,11,0.2)",
                        transition: "transform 0.2s",
                        fontFamily: "var(--font-display)"
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                    >
                        {loading ? (mode === "login" ? "Logging in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Sign Up")}
                    </button>
                </form>

                <p style={{ color: "var(--fg-muted)", fontSize: "14px", marginTop: "32px", textAlign: "center" }}>
                    {mode === "login" ? "Don't have an account?" : "Already have an account?"} {" "}
                    <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>
                        {mode === "login" ? "Create one" : "Sign in instead"}
                    </span>
                </p>
            </div>
        </div>
    );
}
