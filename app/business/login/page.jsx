"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BusinessLoginPage() {
  const router = useRouter();

  const [lang, setLang] = useState("es");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const t = {
    es: {
      title: "Iniciar sesión",
      subtitle: "Accede al panel de administración de tu negocio.",
      email: "Correo electrónico",
      password: "Contraseña",
      passwordPlaceholder: "Tu contraseña",
      forgot: "¿Olvidaste tu contraseña?",
      sending: "Enviando...",
      login: "Iniciar sesión",
      loggingIn: "Iniciando sesión...",
      noAccount: "¿No tienes una cuenta?",
      createAccount: "Crear cuenta",
      invalidCredentials: "Correo electrónico o contraseña incorrectos.",
      emailNotConfirmed:
        "Debes confirmar tu correo electrónico antes de iniciar sesión.",
      noBusiness: "No encontramos un negocio asociado a esta cuenta.",
      loginError: "Ocurrió un error al iniciar sesión.",
      loginFailed: "No se pudo iniciar sesión.",
      enterEmail: "Escribe tu correo electrónico primero.",
      resetSent:
        "Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.",
      resetError: "No se pudo enviar el correo de recuperación.",
      language: "Idioma",
    },

    en: {
      title: "Sign In",
      subtitle: "Access your business administration dashboard.",
      email: "Email",
      password: "Password",
      passwordPlaceholder: "Your password",
      forgot: "Forgot your password?",
      sending: "Sending...",
      login: "Sign In",
      loggingIn: "Signing in...",
      noAccount: "Don't have an account?",
      createAccount: "Create account",
      invalidCredentials: "Incorrect email or password.",
      emailNotConfirmed:
        "You must confirm your email address before signing in.",
      noBusiness: "We could not find a business associated with this account.",
      loginError: "An error occurred while signing in.",
      loginFailed: "Could not sign in.",
      enterEmail: "Enter your email address first.",
      resetSent:
        "We sent you an email to reset your password. Check your inbox.",
      resetError: "Could not send the password recovery email.",
      language: "Language",
    },
  };

  const tr = t[lang];

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setResetMessage("");
    setLoading(true);

    try {
      // 1. Sign in the business owner
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        setError("loginFailed");
        return;
      }

      const userId = authData.user.id;

      // 2. Find the business belonging to this owner
      const { data: business, error: businessError } =
        await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", userId)
          .limit(1)
          .maybeSingle();

      if (businessError) {
        throw businessError;
      }

      if (!business) {
        setError("noBusiness");
        return;
      }

      // 3. Go to the business dashboard
      router.push(`/business/${business.id}/dashboard`);
    } catch (err) {
      console.error("Business login error:", err);

      const message = err?.message?.toLowerCase() || "";

      if (message.includes("invalid login credentials")) {
        setError("invalidCredentials");
      } else if (message.includes("email not confirmed")) {
        setError("emailNotConfirmed");
      } else {
        setError("loginError");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("enterEmail");
      return;
    }

    setResetLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              "https://www.flowpaydr.com/business/reset-password",
          }
        );

      if (error) {
        throw error;
      }

      setResetMessage("resetSent");
    } catch (err) {
      console.error("Password recovery error:", err);

      setError("resetError");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "30px 16px",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        {/* LANGUAGE TOGGLE */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginBottom: "18px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "#666",
              alignSelf: "center",
            }}
          >
            {tr.language}:
          </span>

          <button
            type="button"
            onClick={() => setLang("es")}
            style={{
              border: "none",
              borderRadius: "6px",
              padding: "6px 9px",
              cursor: "pointer",
              fontWeight: "600",
              background: lang === "es" ? "#111" : "#e5e7eb",
              color: lang === "es" ? "#fff" : "#111",
            }}
          >
            ES
          </button>

          <button
            type="button"
            onClick={() => setLang("en")}
            style={{
              border: "none",
              borderRadius: "6px",
              padding: "6px 9px",
              cursor: "pointer",
              fontWeight: "600",
              background: lang === "en" ? "#111" : "#e5e7eb",
              color: lang === "en" ? "#fff" : "#111",
            }}
          >
            EN
          </button>
        </div>

        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: "700",
            }}
          >
            {tr.title}
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#666",
              fontSize: "15px",
            }}
          >
            {tr.subtitle}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "18px",
              fontSize: "14px",
            }}
          >
            {tr[error] || error}
          </div>
        )}

        {resetMessage && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "18px",
              fontSize: "14px",
            }}
          >
            {tr[resetMessage] || resetMessage}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "18px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {tr.email}
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                lang === "es"
                  ? "correo@ejemplo.com"
                  : "email@example.com"
              }
              autoComplete="email"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {tr.password}
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tr.passwordPlaceholder}
              autoComplete="current-password"
              required
              style={inputStyle}
            />
          </div>

          <div
            style={{
              textAlign: "right",
              marginBottom: "22px",
            }}
          >
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                color: "#111",
                fontSize: "14px",
                fontWeight: "600",
                cursor: resetLoading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {resetLoading
                ? tr.sending
                : tr.forgot}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "9px",
              background: "#111",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? tr.loggingIn
              : tr.login}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "14px",
            color: "#666",
          }}
        >
          {tr.noAccount}{" "}
          <button
            type="button"
            onClick={() =>
              router.push("/business/register")
            }
            style={{
              border: "none",
              background: "none",
              padding: 0,
              color: "#111",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {tr.createAccount}
          </button>
        </div>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  marginTop: "7px",
  padding: "12px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "15px",
  boxSizing: "border-box",
};