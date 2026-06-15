export default function StatusBadge({ status, lang = "en" }) {
  const styles = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-blue-100 text-blue-700",
    canceled: "bg-red-100 text-red-700",
    completed: "bg-gray-200 text-gray-700",
    rescheduled: "bg-yellow-100 text-yellow-700",
  };

  const labels = {
    es: {
      confirmed: "Confirmado",
      pending: "Pendiente",
      canceled: "Cancelado",
      completed: "Completado",
      rescheduled: "Reprogramado",
    },
    en: {
      confirmed: "Confirmed",
      pending: "Pending",
      canceled: "Canceled",
      completed: "Completed",
      rescheduled: "Rescheduled",
    },
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded font-medium ${styles[status]}`}
    >
      {labels[lang][status] || status}
    </span>
  );
}
