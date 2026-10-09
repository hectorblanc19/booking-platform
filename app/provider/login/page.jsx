"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ProviderLoginPage() {
  const router = useRouter();

  const [lang, setLang] = useState("es");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");

  const text = {
    es: {
      brand: "FLOWPAYDR BOOKING",
      title: "Panel del Profesional",
      subtitle:
        "Inicia sesión para administrar tus citas y tu disponibilidad.",
      email: "Correo electrónico",
      password: "Contraseña",
      login: "Iniciar sesión",
      loggingIn: "Iniciando sesión...",
      forgot: "¿Olvidaste tu contraseña?",
      noAccess:
        "No encontramos un acceso profesional activo asociado a esta cuenta.",
      invalidLogin: "Correo electrónico o contraseña incorrectos.",
      error:
        "Ocurrió un error al iniciar sesión. Inténtalo nuevamente.",
      businessOwner: "¿Eres dueño del negocio?",
      businessLogin: "Entrar al Panel de Negocio",
      back: "Volver al inicio",
    },

    en: {
      brand: "FLOWPAYDR BOOKING",
      title: "Professional Dashboard",
      subtitle:
        "Sign in to manage your appointments and availability.",
      email: "Email",
      password: "Password",
      login: "Sign in",
      loggingIn: "Signing in...",
      forgot: "Forgot your password?",
      noAccess:
        "We could not find active professional access associated with this account.",
      invalidLogin: "Incorrect email or password.",
      error:
        "An error occurred while signing in. Please try again.",
      businessOwner: "Are you the business owner?",
      businessLogin: "Open Business Dashboard",
      back: "Back to home",
    },
  };

  const t = text[lang];

  // --------------------------------------------------
  // CHECK EXISTING SESSION
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          setCheckingSession(false);
          return;
        }

        const { data: provider, error } = await supabase
          .from("providers")
          .select(
            "id, business_id, name, user_id, dashboard_access, access_status"
          )
          .eq("user_id", session.user.id)
          .eq("dashboard_access", true)
          .eq("access_status", "active")
          .maybeSingle();

        if (!mounted) return;

        if (!error && provider) {
          router.replace("/provider/dashboard");
          return;
        }

        setCheckingSession(false);
      } catch (error) {
        console.error("Provider session check error:", error);

        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------
  async function handleLogin(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError || !authData?.user) {
        console.error("Provider login error:", authError);

        setMessage(t.invalidLogin);
        setLoading(false);
        return;
      }

      const { data: provider, error: providerError } =
        await supabase
          .from("providers")
          .select(
            "id, business_id, name, user_id, dashboard_access, access_status"
          )
          .eq("user_id", authData.user.id)
          .eq("dashboard_access", true)
          .eq("access_status", "active")
          .maybeSingle();

      if (providerError) {
        console.error(
          "Provider lookup error:",
          providerError
        );

        await supabase.auth.signOut();

        setMessage(t.error);
        setLoading(false);
        return;
      }

      if (!provider) {
        await supabase.auth.signOut();

        setMessage(t.noAccess);
        setLoading(false);
        return;
      }

      router.replace("/provider/dashboard");
    } catch (error) {
      console.error("Provider login unexpected error:", error);

      try {
        await supabase.auth.signOut();
      } catch {}

      setMessage(t.error);
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600">
          {lang === "es"
            ? "Verificando acceso..."
            : "Checking access..."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-bold text-xl"
          >
            FLOWPAYDR BOOKING
          </button>

          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => setLang("es")}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                lang === "es"
                  ? "bg-black text-white"
                  : "text-gray-600"
              }`}
            >
              ES
            </button>

            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                lang === "en"
                  ? "bg-black text-white"
                  : "text-gray-600"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* LOGIN */}
      <section className="px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm tracking-[0.25em] text-gray-400 font-semibold mb-3">
              {t.brand}
            </p>

            <h1 className="text-3xl font-bold mb-3">
              {t.title}
            </h1>

            <p className="text-gray-600">
              {t.subtitle}
            </p>
          </div>

          <div className="bg-white border rounded-2xl shadow-sm p-6 sm:p-8">
            {message && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t.email}
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  autoComplete="email"
                  className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t.password}
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  autoComplete="current-password"
                  className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/business/reset-password"
                    )
                  }
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t.forgot}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white rounded-lg px-4 py-3 font-semibold disabled:opacity-60"
              >
                {loading
                  ? t.loggingIn
                  : t.login}
              </button>
            </form>

            <div className="border-t mt-7 pt-6 text-center">
              <p className="text-sm text-gray-500 mb-3">
                {t.businessOwner}
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/business/login")
                }
                className="w-full border rounded-lg px-4 py-3 font-semibold hover:bg-gray-50"
              >
                {t.businessLogin}
              </button>
            </div>
          </div>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-gray-500 hover:text-black"
            >
              ← {t.back}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}