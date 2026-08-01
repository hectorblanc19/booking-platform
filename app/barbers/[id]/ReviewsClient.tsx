"use client";

import { useState } from "react";

export default function ReviewsClient({ reviews, averageRating, lang }) {
  const [expanded, setExpanded] = useState(false);

  const t = {
    en: {
      showMore: "Show more reviews",
      showLess: "Show less",
    },
    es: {
      showMore: "Ver más reseñas",
      showLess: "Mostrar menos",
    },
  };

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">
        {lang === "es" ? "Calificaciones y Reseñas" : "Ratings & Reviews"}
      </h2>

      {reviews.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-2xl font-bold text-yellow-500">
            {averageRating.toFixed(1)}★
          </span>
          <span className="text-sm text-slate-600">
            ({reviews.length})
          </span>
        </div>
      )}

      {/* ⭐ Show only 3 reviews unless expanded */}
      <div className="mt-4 space-y-4">
        {(expanded ? reviews : reviews.slice(0, 3)).map((review) => (
          <div
            key={review.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-yellow-500 font-semibold">
                {review.rating}★
              </span>
              <span className="text-xs text-slate-500">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-800">{review.comment}</p>

            {review.customer_name && (
              <p className="mt-1 text-xs text-slate-500">
                — {review.customer_name}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ⭐ Show More / Show Less */}
      {reviews.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:border-blue-600"
        >
          {expanded ? t[lang].showLess : t[lang].showMore}
        </button>
      )}
    </div>
  );
}
