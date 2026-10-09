"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ProviderResetPasswordPage() {
  const router = useRouter();

  const [lang, setLang] = useState("es");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError || !data.session) {
        setError(
          lang === "es"
            ? "El enlace de recuperación no es válido o ha expirado. Solicita un nuevo enlace."
            : "The recovery link is invalid or has expired. Request a new link."
        );
      }

      setCheckingSession(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setError("");
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [lang]);

  async function handleUpdatePassword(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError(
        lang === "es"
          ? "La contraseña debe tener al menos 6 caracteres."
          : "The password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        lang === "es"
          ? "Las contraseñas no coinciden."
          : "The passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        lang === "es"
          ? "Tu contraseña fue actualizada correctamente."
          : "Your password was updated successfully."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.replace("/provider/login");
      }, 2000);
    } catch (err) {
      console.error(
        "Provider password update error:",
        err
      );

      setError(
        lang === "es"
          ? "No se pudo actualizar la contraseña. Solicita un nuevo enlace e inténtalo nuevamente."
          : "Could not update the password. Request a new link and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f5f5f5",
        }}
      >
        <p>
          {lang === "es"
            ? "Verificando enlace..."
            : "Checking link..."}
        </p>
      </main>
    );
  }

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
          border: "1px solid #111",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "800",
              }}
            >
              FLOWPAYDR BOOKING
            </div>

            <div
              style={{
                marginTop: "2px",
                color: "#777",
                fontSize: "14px",
              }}
            >
              {lang === "es"
                ? "Acceso Profesional"
                : "Professional Access"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              background: "#f1f1f1",
              borderRadius: "999px",
              padding: "3px",
            }}
          >
            <button
              type="button"
              onClick={() => setLang("es")}
              style={{
                border: "none",
                borderRadius: "999px",
                padding: "7px 12px",
                cursor: "pointer",
                background:
                  lang === "es" ? "#000" : "transparent",
                color:
                  lang === "es" ? "#fff" : "#777",
                fontWeight: "700",
              }}
            >
              ES
            </button>

            <button
              type="button"
              onClick={() => setLang("en")}
              style={{
                border: "none",
                borderRadius: "999px",
                padding: "7px 12px",
                cursor: "pointer",
                background:
                  lang === "en" ? "#000" : "transparent",
                color:
                  lang === "en" ? "#fff" : "#777",
                fontWeight: "700",
              }}
            >
              EN
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "26px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "27px",
              fontWeight: "800",
            }}
          >
            {lang === "es"
              ? "Crear nueva contraseña"
              : "Create new password"}
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#666",
              fontSize: "15px",
              lineHeight: "1.5",
            }}
          >
            {lang === "es"
              ? "Crea una nueva contraseña para tu cuenta profesional."
              : "Create a new password for your professional account."}
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
              lineHeight: "1.5",
            }}
          >
            {error}
          </div>
        )}

        {success && (
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
            {success}
          </div>
        )}

        {!error && (
          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                }}
              >
                {lang === "es"
                  ? "Nueva contraseña"
                  : "New password"}
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder={
                  lang === "es"
                    ? "Mínimo 6 caracteres"
                    : "Minimum 6 characters"
                }
                autoComplete="new-password"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "22px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                }}
              >
                {lang === "es"
                  ? "Confirmar contraseña"
                  : "Confirm password"}
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder={
                  lang === "es"
                    ? "Repite tu contraseña"
                    : "Repeat your password"
                }
                autoComplete="new-password"
                required
                style={inputStyle}
              />
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
                ? lang === "es"
                  ? "Actualizando..."
                  : "Updating..."
                : lang === "es"
                ? "Actualizar contraseña"
                : "Update password"}
            </button>
          </form>
        )}

        {error && (
          <button
            type="button"
            onClick={() =>
              router.replace("/provider/login")
            }
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "9px",
              background: "#fff",
              color: "#111",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {lang === "es"
              ? "Volver al inicio de sesión"
              : "Back to sign in"}
          </button>
        )}
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