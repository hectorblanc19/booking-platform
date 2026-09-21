"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BusinessRegisterPage() {
  const router = useRouter();

  const [lang, setLang] = useState("es");

  const [form, setForm] = useState({
    businessName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    category: "",
    openTime: "08:00",
    closeTime: "18:00",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const t = {
    es: {
      language: "Idioma",
      title: "Crear cuenta de negocio",
      subtitle:
        "Registra tu negocio y comienza a administrar tus citas.",

      businessName: "Nombre del negocio",
      businessPlaceholder: "Ej. Barbería Premium",

      email: "Correo electrónico",
      emailPlaceholder: "correo@ejemplo.com",

      password: "Contraseña",
      passwordPlaceholder: "Mínimo 6 caracteres",

      phone: "Teléfono",
      phonePlaceholder: "809-000-0000",

      address: "Dirección",
      addressPlaceholder: "Dirección del negocio",

      category: "Categoría",
      selectCategory: "Selecciona una categoría",

      barbershop: "Barbería",
      nails: "Uñas / Nail Tech",
      salon: "Salón de Belleza",
      spa: "Spa",
      veterinarian: "Veterinario",
      dentist: "Dentista",
      doctor: "Doctor / Clínica",
      carwash: "Car Wash",
      other: "Otro",

      openTime: "Hora de apertura",
      closeTime: "Hora de cierre",

      create: "Crear cuenta",
      creating: "Creando cuenta...",

      alreadyAccount: "¿Ya tienes una cuenta?",
      login: "Iniciar sesión",

      businessRequired: "Escribe el nombre del negocio.",
      emailRequired: "Escribe tu correo electrónico.",
      passwordRequired:
        "La contraseña debe tener al menos 6 caracteres.",
      categoryRequired: "Selecciona una categoría.",

      existingAccount:
        "Este correo ya tiene una cuenta. Inicia sesión para continuar.",

      existingAccountAlt:
        "Este correo ya tiene una cuenta. Inicia sesión en lugar de crear otra cuenta.",

      accountFailed: "No se pudo crear la cuenta.",

      ownerFailed:
        "No se pudo identificar al propietario de la cuenta.",

      success:
        "Cuenta creada correctamente. Revisa tu correo para confirmar tu cuenta.",

      generalError:
        "Ocurrió un error al crear la cuenta. Inténtalo nuevamente.",
    },

    en: {
      language: "Language",
      title: "Create Business Account",
      subtitle:
        "Register your business and start managing your appointments.",

      businessName: "Business Name",
      businessPlaceholder: "Example: Premium Barbershop",

      email: "Email",
      emailPlaceholder: "email@example.com",

      password: "Password",
      passwordPlaceholder: "Minimum 6 characters",

      phone: "Phone",
      phonePlaceholder: "809-000-0000",

      address: "Address",
      addressPlaceholder: "Business address",

      category: "Category",
      selectCategory: "Select a category",

      barbershop: "Barbershop",
      nails: "Nails / Nail Tech",
      salon: "Beauty Salon",
      spa: "Spa",
      veterinarian: "Veterinarian",
      dentist: "Dentist",
      doctor: "Doctor / Clinic",
      carwash: "Car Wash",
      other: "Other",

      openTime: "Opening Time",
      closeTime: "Closing Time",

      create: "Create Account",
      creating: "Creating account...",

      alreadyAccount: "Already have an account?",
      login: "Sign In",

      businessRequired: "Enter your business name.",
      emailRequired: "Enter your email address.",
      passwordRequired:
        "The password must be at least 6 characters.",
      categoryRequired: "Select a category.",

      existingAccount:
        "This email already has an account. Sign in to continue.",

      existingAccountAlt:
        "This email already has an account. Sign in instead of creating another account.",

      accountFailed: "Could not create the account.",

      ownerFailed:
        "Could not identify the account owner.",

      success:
        "Account created successfully. Check your email to confirm your account.",

      generalError:
        "An error occurred while creating the account. Please try again.",
    },
  };

  const tr = t[lang];

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.businessName.trim()) {
      setError(tr.businessRequired);
      return;
    }

    if (!form.email.trim()) {
      setError(tr.emailRequired);
      return;
    }

    if (form.password.length < 6) {
      setError(tr.passwordRequired);
      return;
    }

    if (!form.category) {
      setError(tr.categoryRequired);
      return;
    }

    setLoading(true);

    try {
      const email = form.email.trim().toLowerCase();

      let userId = null;
      let currentSession = null;
      let isExistingAccount = false;

      // --------------------------------------------------
      // 1. TRY TO CREATE A NEW SUPABASE AUTH USER
      // --------------------------------------------------
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo:
            "https://www.flowpaydr.com/business/login",
        },
      });

      // Supabase can report an existing user either through
      // an error or by returning a user with zero identities.
      const alreadyRegistered =
        authError?.message
          ?.toLowerCase()
          .includes("already registered") ||
        (authData?.user &&
          Array.isArray(authData.user.identities) &&
          authData.user.identities.length === 0);

      // --------------------------------------------------
      // 2. EXISTING AUTH ACCOUNT
      // Sign in using the email/password entered in the form
      // --------------------------------------------------
      if (alreadyRegistered) {
        isExistingAccount = true;

        const {
          data: signInData,
          error: signInError,
        } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });

        if (signInError || !signInData?.user) {
          console.error(
            "Existing account sign-in error:",
            signInError
          );

          setError(
            lang === "es"
              ? "Este correo ya tiene una cuenta. Verifica tu contraseña o inicia sesión."
              : "This email already has an account. Check your password or sign in."
          );

          return;
        }

        userId = signInData.user.id;
        currentSession = signInData.session;
      } else {
        // --------------------------------------------------
        // NEW AUTH ACCOUNT
        // --------------------------------------------------
        if (authError) {
          throw authError;
        }

        if (!authData?.user) {
          throw new Error(tr.accountFailed);
        }

        userId = authData.user.id;
        currentSession = authData.session;
      }

      if (!userId) {
        throw new Error(tr.ownerFailed);
      }

      // --------------------------------------------------
      // 3. CHECK WHETHER THIS USER ALREADY OWNS A BUSINESS
      // --------------------------------------------------
      const {
        data: existingBusinesses,
        error: existingBusinessError,
      } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("owner_id", userId)
        .limit(1);

      if (existingBusinessError) {
        throw existingBusinessError;
      }

      if (
        existingBusinesses &&
        existingBusinesses.length > 0
      ) {
        const existingBusiness = existingBusinesses[0];

        setError(
          lang === "es"
            ? `Esta cuenta ya está asociada al negocio "${existingBusiness.name}". Inicia sesión para acceder al panel.`
            : `This account is already associated with "${existingBusiness.name}". Sign in to access the dashboard.`
        );

        return;
      }

      // --------------------------------------------------
      // 4. USER HAS NO BUSINESS
      // Create a new business under this Auth user
      // --------------------------------------------------
      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .insert({
          name: form.businessName.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          category: form.category.trim() || null,
          open_time: form.openTime || null,
          close_time: form.closeTime || null,
          owner_id: userId,
        })
        .select()
        .single();

      if (businessError) {
        throw businessError;
      }

      // --------------------------------------------------
      // 5. EXISTING USER WHO RE-REGISTERED
      // Already has a valid session, so go straight to dashboard
      // --------------------------------------------------
      if (isExistingAccount && currentSession) {
        router.push(
          `/business/${business.id}/dashboard`
        );

        return;
      }

      // --------------------------------------------------
      // 6. NEW ACCOUNT WITH EMAIL CONFIRMATION REQUIRED
      // --------------------------------------------------
      if (!currentSession) {
        setSuccess(tr.success);

        setTimeout(() => {
          router.push("/business/login");
        }, 2500);

        return;
      }

      // --------------------------------------------------
      // 7. NEW ACCOUNT WITH ACTIVE SESSION
      // --------------------------------------------------
      router.push(
        `/business/${business.id}/dashboard`
      );
    } catch (err) {
      console.error(
        "Business registration error:",
        err
      );

      setError(
        err?.message || tr.generalError
      );
    } finally {
      setLoading(false);
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
          maxWidth: "520px",
          background: "#fff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow:
            "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        {/* LANGUAGE TOGGLE */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "8px",
            marginBottom: "18px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "#666",
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
              background:
                lang === "es"
                  ? "#111"
                  : "#e5e7eb",
              color:
                lang === "es"
                  ? "#fff"
                  : "#111",
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
              background:
                lang === "en"
                  ? "#111"
                  : "#e5e7eb",
              color:
                lang === "en"
                  ? "#fff"
                  : "#111",
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

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: "16px" }}>
            <label>{tr.businessName}</label>

            <input
              type="text"
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              placeholder={tr.businessPlaceholder}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label>{tr.email}</label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder={tr.emailPlaceholder}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label>{tr.password}</label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder={tr.passwordPlaceholder}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label>{tr.phone}</label>

            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder={tr.phonePlaceholder}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label>{tr.address}</label>

            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder={tr.addressPlaceholder}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label>{tr.category}</label>

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="">
                {tr.selectCategory}
              </option>

              {/* BARBERSHOP OWNER */}
              <option value="barbershop">
                {tr.barbershop}
              </option>

              <option value="nails">
                {tr.nails}
              </option>

              <option value="salon">
                {tr.salon}
              </option>

              <option value="spa">
                {tr.spa}
              </option>

              <option value="veterinarian">
                {tr.veterinarian}
              </option>

              <option value="dentist">
                {tr.dentist}
              </option>

              <option value="doctor">
                {tr.doctor}
              </option>

              <option value="carwash">
                {tr.carwash}
              </option>

              <option value="other">
                {tr.other}
              </option>
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "22px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label
  style={{
    height: "52px",
    display: "flex",
    alignItems: "flex-end",
    lineHeight: "1.25",
  }}
>               
 {tr.openTime}
              </label>

              <input
                type="time"
                name="openTime"
                value={form.openTime}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
             
<label
  style={{
    height: "52px",
    display: "flex",
    alignItems: "flex-end",
    lineHeight: "1.25",
  }}
>
                {tr.closeTime}
              </label>

              <input
                type="time"
                name="closeTime"
                value={form.closeTime}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
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
              ? tr.creating
              : tr.create}
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
          {tr.alreadyAccount}{" "}
          <button
            type="button"
            onClick={() =>
              router.push("/business/login")
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
            {tr.login}
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