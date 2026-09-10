"use client";

export default function ProviderAvailability({
  lang,
  providers,

  selectedAvailabilityProviderId,
  setSelectedAvailabilityProviderId,

  providerAvailability,
  setProviderAvailability,

  loadProviderAvailability,
  saveProviderAvailability,
  savingProviderAvailability,
}) {
  return (
    <div className="mt-6 bg-white border rounded-xl shadow p-4 space-y-4">
      <h3 className="text-lg font-semibold">
        {lang === "es"
          ? "Horario del profesional"
          : "Provider Availability"}
      </h3>

      <div>
        <label className="block text-sm font-medium mb-1">
          {lang === "es"
            ? "Selecciona un profesional"
            : "Select provider"}
        </label>

        <select
          className="border p-2 rounded w-full"
          value={selectedAvailabilityProviderId}
          onChange={async (e) => {
            const providerId = e.target.value;

            setSelectedAvailabilityProviderId(providerId);
            await loadProviderAvailability(providerId);
          }}
        >
          <option value="">
            {lang === "es"
              ? "Selecciona un profesional"
              : "Select provider"}
          </option>

          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      {selectedAvailabilityProviderId && (
        <div className="space-y-2">
          {providerAvailability.length === 0 ? (
            <p className="text-sm text-gray-500">
              {lang === "es"
                ? "No hay horario configurado."
                : "No availability configured."}
            </p>
          ) : (
            providerAvailability.map((day) => (
              <div
                key={day.id}
                className="border rounded-lg p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {
                      [
                        lang === "es" ? "Domingo" : "Sunday",
                        lang === "es" ? "Lunes" : "Monday",
                        lang === "es" ? "Martes" : "Tuesday",
                        lang === "es" ? "Miércoles" : "Wednesday",
                        lang === "es" ? "Jueves" : "Thursday",
                        lang === "es" ? "Viernes" : "Friday",
                        lang === "es" ? "Sábado" : "Saturday",
                      ][day.day_of_week]
                    }
                  </p>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={day.is_available}
                      onChange={(e) => {
                        const checked = e.target.checked;

                        setProviderAvailability((prev) =>
                          prev.map((item) =>
                            item.id === day.id
                              ? {
                                  ...item,
                                  is_available: checked,
                                }
                              : item
                          )
                        );
                      }}
                    />

                    {day.is_available
                      ? lang === "es"
                        ? "Disponible"
                        : "Available"
                      : lang === "es"
                      ? "No disponible"
                      : "Unavailable"}
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === "es"
                        ? "Hora de inicio"
                        : "Start time"}
                    </label>

                    <input
                      type="time"
                      className="border p-2 rounded w-full"
                      value={day.start_time?.slice(0, 5) || ""}
                      disabled={!day.is_available}
                      onChange={(e) => {
                        const value = e.target.value;

                        setProviderAvailability((prev) =>
                          prev.map((item) =>
                            item.id === day.id
                              ? {
                                  ...item,
                                  start_time: value,
                                }
                              : item
                          )
                        );
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === "es"
                        ? "Hora de cierre"
                        : "End time"}
                    </label>

                    <input
                      type="time"
                      className="border p-2 rounded w-full"
                      value={day.end_time?.slice(0, 5) || ""}
                      disabled={!day.is_available}
                      onChange={(e) => {
                        const value = e.target.value;

                        setProviderAvailability((prev) =>
                          prev.map((item) =>
                            item.id === day.id
                              ? {
                                  ...item,
                                  end_time: value,
                                }
                              : item
                          )
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedAvailabilityProviderId && (
        <button
          type="button"
          onClick={saveProviderAvailability}
          disabled={savingProviderAvailability}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {savingProviderAvailability
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
            ? "Guardar horario"
            : "Save Schedule"}
        </button>
      )}
    </div>
  );
}