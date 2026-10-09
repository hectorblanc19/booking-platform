"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ProviderActivatePage() {
  const router = useRouter();

  const [lang, setLang] = useState("es");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("error");

  // --------------------------------------------------
  // LOAD INVITED PROFESSIONAL
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadProvider() {
      try {
        setLoading(true);
        setMessage("");

        // ----------------------------------------------
        // GET CURRENT AUTH SESSION
        // ----------------------------------------------
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "Provider activation session error:",
            sessionError
          );
        }

        if (!session?.user) {
          if (!mounted) return;

          setMessage(
            lang === "es"
              ? "No encontramos una invitación activa. Abre nuevamente el enlace que recibiste por correo."
              : "We could not find an active invitation. Open the link you received by email again."
          );

          setLoading(false);
          return;
        }

        const currentUser = session.user;
console.log(
  "Provider activation authenticated user:",
  currentUser.id,
  currentUser.email
);

      if (!mounted) return;

        setUser(currentUser);

        // ----------------------------------------------
        // FIND PROVIDER CONNECTED TO AUTH USER
        // ----------------------------------------------
        const {
          data: providerData,
          error: providerError,
        } = await supabase
          .from("providers")
          .select(
            `
              id,
              business_id,
              name,
              email,
              specialty,
              dashboard_access,
              access_status,
              activated_at
            `
          )
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (providerError) {
          console.error(
            "Provider activation lookup error:",
            providerError
          );

          if (!mounted) return;

          setMessage(
            lang === "es"
              ? "No pudimos verificar tu acceso profesional."
              : "We could not verify your professional access."
          );

          setLoading(false);
          return;
        }

        if (!providerData) {
          if (!mounted) return;

          setMessage(
            lang === "es"
              ? "Esta cuenta no está conectada a un profesional de FlowPayDR."
              : "This account is not connected to a FlowPayDR professional."
          );

          setLoading(false);
          return;
        }

        if (!providerData.dashboard_access) {
          if (!mounted) return;

          setMessage(
            lang === "es"
              ? "El acceso al panel profesional no está habilitado para esta cuenta."
              : "Professional dashboard access is not enabled for this account."
          );

          setLoading(false);
          return;
        }

        // ----------------------------------------------
        // ALREADY ACTIVE
        // ----------------------------------------------
        if (
          providerData.access_status === "active"
        ) {
          router.replace("/provider/dashboard");
          return;
        }

        // ----------------------------------------------
        // MUST BE AN INVITED ACCOUNT
        // ----------------------------------------------
        if (
          providerData.access_status !== "invited"
        ) {
          if (!mounted) return;

          setMessage(
            lang === "es"
              ? "Esta invitación no está disponible para activación."
              : "This invitation is not available for activation."
          );

          setLoading(false);
          return;
        }

        if (!mounted) return;

        setProvider(providerData);
        setLoading(false);
      } catch (error) {
        console.error(
          "Provider activation load error:",
          error
        );

        if (!mounted) return;

        setMessage(
          lang === "es"
            ? "Ocurrió un error verificando tu invitación."
            : "An error occurred while verifying your invitation."
        );

        setLoading(false);
      }
    }

    loadProvider();

    return () => {
      mounted = false;
    };
  }, [lang, router]);

  // --------------------------------------------------
  // ACTIVATE PROFESSIONAL ACCOUNT
  // --------------------------------------------------
  async function activateAccount(e) {
    e.preventDefault();

    if (!provider || !user) {
      return;
    }

    setMessage("");

    if (password.length < 8) {
      setMessageType("error");

      setMessage(
        lang === "es"
          ? "La contraseña debe tener por lo menos 8 caracteres."
          : "Password must contain at least 8 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setMessageType("error");

      setMessage(
        lang === "es"
          ? "Las contraseñas no coinciden."
          : "Passwords do not match."
      );

      return;
    }

    setSaving(true);

    try {
      // ----------------------------------------------
      // SET PASSWORD FOR INVITED AUTH USER
      // ----------------------------------------------
      const {
        error: passwordError,
      } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        console.error(
          "Provider password setup error:",
          passwordError
        );

        setMessageType("error");

        setMessage(
          lang === "es"
            ? "No se pudo crear tu contraseña. Inténtalo nuevamente."
            : "Your password could not be created. Please try again."
        );

        return;
      }

      // ----------------------------------------------
      // MARK PROVIDER AS ACTIVE
      // RLS must allow the provider to update their
      // own row where user_id = auth.uid()
      // ----------------------------------------------
      const {
        error: providerUpdateError,
      } = await supabase
        .from("providers")
        .update({
          access_status: "active",
          dashboard_access: true,
          activated_at: new Date().toISOString(),
        })
        .eq("id", provider.id)
        .eq("user_id", user.id);

      if (providerUpdateError) {
        console.error(
          "Provider activation database error:",
          providerUpdateError
        );

        setMessageType("error");

        setMessage(
          lang === "es"
            ? "Tu contraseña fue creada, pero no pudimos terminar de activar el panel. Inténtalo nuevamente."
            : "Your password was created, but we could not finish activating the dashboard. Please try again."
        );

        return;
      }

      // ----------------------------------------------
      // SUCCESS
      // ----------------------------------------------
      setMessageType("success");

      setMessage(
        lang === "es"
          ? "Cuenta activada correctamente. Abriendo tu panel..."
          : "Account activated successfully. Opening your dashboard..."
      );

      setTimeout(() => {
        router.replace("/provider/dashboard");
      }, 700);
    } catch (error) {
      console.error(
        "Provider activation error:",
        error
      );

      setMessageType("error");

      setMessage(
        lang === "es"
          ? "Ocurrió un error activando tu cuenta."
          : "An error occurred while activating your account."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border rounded-2xl shadow-sm p-8 w-full max-w-md text-center">
          <p className="font-semibold">
            FLOWPAYDR BOOKING
          </p>

          <p className="text-sm text-gray-500 mt-2">
            {lang === "es"
              ? "Verificando invitación..."
              : "Verifying invitation..."}
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // NO VALID PROVIDER
  // --------------------------------------------------
  if (!provider) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border rounded-2xl shadow-sm p-8 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="font-bold">
                FLOWPAYDR BOOKING
              </p>

              <p className="text-xs text-gray-500">
                {lang === "es"
                  ? "Acceso Profesional"
                  : "Professional Access"}
              </p>
            </div>

            <div className="flex bg-gray-100 rounded-full p-1">
              <button
                type="button"
                onClick={() => setLang("es")}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  lang === "es"
                    ? "bg-black text-white"
                    : "text-gray-500"
                }`}
              >
                ES
              </button>

              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  lang === "en"
                    ? "bg-black text-white"
                    : "text-gray-500"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 text-sm">
            {message ||
              (lang === "es"
                ? "No se pudo verificar la invitación."
                : "The invitation could not be verified.")}
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/provider/login")
            }
            className="mt-5 w-full border border-gray-300 rounded-xl px-4 py-3 font-semibold"
          >
            {lang === "es"
              ? "Ir al inicio de sesión"
              : "Go to sign in"}
          </button>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // ACTIVATION FORM
  // --------------------------------------------------
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border rounded-2xl shadow-sm p-8 w-full max-w-md">
        {/* HEADER */}
        <div className="flex justify-between items-start gap-4 mb-8">
          <div>
            <p className="font-bold">
              FLOWPAYDR BOOKING
            </p>

            <p className="text-xs text-gray-500 mt-1">
              {lang === "es"
                ? "Activar Panel Profesional"
                : "Activate Professional Dashboard"}
            </p>
          </div>

          <div className="flex bg-gray-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => setLang("es")}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                lang === "es"
                  ? "bg-black text-white"
                  : "text-gray-500"
              }`}
            >
              ES
            </button>

            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                lang === "en"
                  ? "bg-black text-white"
                  : "text-gray-500"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* WELCOME */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {lang === "es"
              ? `Hola, ${provider.name}`
              : `Hello, ${provider.name}`}
          </h1>

          <p className="text-gray-500 mt-2 text-sm">
            {lang === "es"
              ? "Has sido invitado a administrar tus citas y disponibilidad en FlowPayDR Booking."
              : "You have been invited to manage your appointments and availability in FlowPayDR Booking."}
          </p>
        </div>

        {/* PROFESSIONAL INFO */}
        <div className="border rounded-xl p-4 mb-6 bg-gray-50">
          <p className="font-semibold">
            {provider.name}
          </p>

          {provider.specialty && (
            <p className="text-sm text-gray-500 mt-1">
              {provider.specialty}
            </p>
          )}

          <p className="text-sm text-gray-500 mt-1">
            {provider.email}
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={activateAccount}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              {lang === "es"
                ? "Crear contraseña"
                : "Create password"}
            </label>

            <input
              type="password"
              autoComplete="new-password"
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder={
                lang === "es"
                  ? "Mínimo 8 caracteres"
                  : "Minimum 8 characters"
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {lang === "es"
                ? "Confirmar contraseña"
                : "Confirm password"}
            </label>

            <input
              type="password"
              autoComplete="new-password"
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              placeholder={
                lang === "es"
                  ? "Escribe la contraseña nuevamente"
                  : "Enter the password again"
              }
            />
          </div>

          {message && (
            <div
              className={`rounded-xl p-3 text-sm ${
                messageType === "success"
                  ? "border border-green-200 bg-green-50 text-green-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-black text-white rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
          >
            {saving
              ? lang === "es"
                ? "Activando..."
                : "Activating..."
              : lang === "es"
              ? "Crear contraseña y activar"
              : "Create password and activate"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-5">
          {lang === "es"
            ? "Después de activar tu cuenta podrás iniciar sesión en el Panel del Profesional."
            : "After activating your account, you can sign in to the Professional Dashboard."}
        </p>
      </div>
    </main>
  );
}