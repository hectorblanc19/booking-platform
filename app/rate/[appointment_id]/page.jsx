"use client";

import { use, useState, useEffect } from "react";

export default function RatePage({ params }) {
  // ⭐ FIX 1: unwrap params (Next.js 16)
  const { appointment_id } = use(params);
  const appointmentId = appointment_id;

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [animateSuccess, setAnimateSuccess] = useState(false);

  // ⭐ Language dictionary
  const t = {
    en: {
      notFoundTitle: "Appointment not found",
      alreadyRatedTitle: "Thank you for your review",
      alreadyRatedText: "You already rated this appointment.",
      thanksTitle: "Thank you!",
      thanksText: "Your review was submitted successfully.",
      rateTitle: "Rate your experience",
      placeholder: "Write a review (optional)",
      submit: "Submit Review",
      selectRating: "Please select a rating.",
      loading: "Loading...",
    },
    es: {
      notFoundTitle: "Cita no encontrada",
      alreadyRatedTitle: "Gracias por tu reseña",
      alreadyRatedText: "Ya calificaste esta cita.",
      thanksTitle: "¡Gracias!",
      thanksText: "Tu reseña fue enviada correctamente.",
      rateTitle: "Califica tu experiencia",
      placeholder: "Escribe una reseña (opcional)",
      submit: "Enviar Reseña",
      selectRating: "Por favor selecciona una calificación.",
      loading: "Cargando...",
    },
  };

  // ⭐ Fetch appointment info
  useEffect(() => {
    async function fetchAppointment() {
      try {
        const res = await fetch(`/api/rate/get?id=${appointmentId}`);
        const data = await res.json();

        setRating(0); // reset stars
        setAppointment(data);
      } catch (err) {
        console.error("Error loading appointment:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointment();
  }, [appointmentId]);

  // ⭐ Determine language from appointment
  const lang = appointment?.lang === "es" ? "es" : "en";

  // ⭐ Loading state
  if (loading) return <p>{t[lang].loading}</p>;

  // ⭐ Appointment not found
  if (!appointment) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">{t[lang].notFoundTitle}</h2>
      </div>
    );
  }

  // ⭐ Already rated
  if (appointment.rating_submitted) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">{t[lang].alreadyRatedTitle}</h2>
        <p>{t[lang].alreadyRatedText}</p>
      </div>
    );
  }

  // ⭐ After submitting (with success animation)
  if (submitted) {
    return (
      <div className="p-6 text-center">
        {animateSuccess && (
          <div className="flex justify-center mb-4">
            <div className="animate-bounce text-green-500 text-6xl">✔</div>
          </div>
        )}
        <h2 className="text-2xl font-bold mb-4">{t[lang].thanksTitle}</h2>
        <p>{t[lang].thanksText}</p>
      </div>
    );
  }

  // ⭐ Submit rating
  async function submitRating() {
    if (rating === 0) return alert(t[lang].selectRating);

    const res = await fetch("/api/ratings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // ⭐ FIX 2: correct field name from API response
        appointment_id: appointment.appointment_id,
        barber_id: appointment.barber_id,
        business_id: appointment.business_id,
        customer_id: appointment.customer_id || null,
        rating,
        review_text: review,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setAnimateSuccess(true);
      setSubmitted(true);
    } else {
      alert("Error submitting review.");
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">{t[lang].rateTitle}</h2>

      {/* ⭐ Star rating */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => setRating(star)}
            className={`cursor-pointer text-3xl transition-all duration-200 ${
              rating >= star ? "text-yellow-400" : "text-gray-300"
            } hover:scale-125 active:scale-150`}
          >
            ⭐
          </span>
        ))}
      </div>

      {/* ⭐ Review Text */}
      <textarea
        className="w-full p-3 border rounded mb-4"
        rows={4}
        placeholder={t[lang].placeholder}
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />

      <button
        onClick={submitRating}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
      >
        {t[lang].submit}
      </button>
    </div>
  );
}
