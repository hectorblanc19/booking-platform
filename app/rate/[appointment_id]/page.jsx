"use client";

import { useState, useEffect } from "react";

export default function RatePage({ params }) {
  const appointmentId = params.appointment_id;

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);

  // ⭐ IMPORTANT: force rating to start at 0 on first render
  const [rating, setRating] = useState(0);

  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ⭐ Fetch appointment info
  useEffect(() => {
    async function fetchAppointment() {
      try {
        const res = await fetch(`/api/rate/get?id=${appointmentId}`);
        const data = await res.json();

        // ⭐ Force rating reset BEFORE setting appointment
        setRating(0);

        setAppointment(data);
      } catch (err) {
        console.error("Error loading appointment:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointment();
  }, [appointmentId]);

  // ⭐ Loading state
  if (loading) return <p>Loading...</p>;

  // ⭐ Appointment not found
  if (!appointment) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Cita no encontrada</h2>
      </div>
    );
  }

  // ⭐ Already rated
  if (appointment.rating_submitted) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Gracias por tu reseña</h2>
        <p>Ya calificaste esta cita.</p>
      </div>
    );
  }

  // ⭐ After submitting
  if (submitted) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">¡Gracias!</h2>
        <p>Tu reseña fue enviada correctamente.</p>
      </div>
    );
  }

 // ⭐ Submit rating
async function submitRating() {
  if (rating === 0) return alert("Por favor selecciona una calificación.");

  const res = await fetch("/api/ratings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appointment_id: appointment.id,
      barber_id: appointment.barber_id,
      business_id: appointment.business_id,
      customer_id: appointment.customer_id || null,
      rating,
      review_text: review,   // ⭐ FIXED — correct column name
    }),
  });

  const data = await res.json();

  if (data.success) {
    setSubmitted(true);
  } else {
    alert("Error al enviar la reseña.");
  }
}

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Califica tu experiencia</h2>

      {/* ⭐ Star rating */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => setRating(star)}
            className={`cursor-pointer text-3xl ${
              rating >= star ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            ⭐
          </span>
        ))}
      </div>

      {/* ⭐ Review Text */}
      <textarea
        className="w-full p-3 border rounded mb-4"
        rows={4}
        placeholder="Escribe una reseña (opcional)"
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />

      <button
        onClick={submitRating}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
      >
        Enviar Reseña
      </button>
    </div>
  );
}
