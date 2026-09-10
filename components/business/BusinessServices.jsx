"use client";

export default function BusinessServices({
  lang,
  services,
  providers,

  newServiceName,
  setNewServiceName,
  newServiceDescription,
  setNewServiceDescription,
  newServicePrice,
  setNewServicePrice,
  newServiceDuration,
  setNewServiceDuration,
  newServiceProviderId,
  setNewServiceProviderId,
  savingService,
  addService,

  editingServiceId,
  editServiceName,
  setEditServiceName,
  editServiceDescription,
  setEditServiceDescription,
  editServicePrice,
  setEditServicePrice,
  editServiceDuration,
  setEditServiceDuration,
  editServiceProviderId,
  setEditServiceProviderId,
  savingEditService,

  startEditService,
  cancelEditService,
  updateService,
  toggleServiceActive,
}) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {lang === "es" ? "Servicios" : "Services"}
      </h2>

      {/* ADD SERVICE */}
      <div className="bg-white border rounded-xl shadow p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border p-2 rounded"
            placeholder={
              lang === "es"
                ? "Nombre del servicio"
                : "Service name"
            }
            value={newServiceName}
            onChange={(e) =>
              setNewServiceName(e.target.value)
            }
          />

          <input
            className="border p-2 rounded"
            placeholder={
              lang === "es"
                ? "Descripción"
                : "Description"
            }
            value={newServiceDescription}
            onChange={(e) =>
              setNewServiceDescription(e.target.value)
            }
          />

          <input
            type="number"
            min="0"
            step="0.01"
            className="border p-2 rounded"
            placeholder={
              lang === "es"
                ? "Precio RD$"
                : "Price RD$"
            }
            value={newServicePrice}
            onChange={(e) =>
              setNewServicePrice(e.target.value)
            }
          />

          <input
            type="number"
            min="1"
            className="border p-2 rounded"
            placeholder={
              lang === "es"
                ? "Duración en minutos"
                : "Duration in minutes"
            }
            value={newServiceDuration}
            onChange={(e) =>
              setNewServiceDuration(e.target.value)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {lang === "es"
              ? "Profesional"
              : "Provider"}
          </label>

          <select
            className="border p-2 rounded w-full"
            value={newServiceProviderId}
            onChange={(e) =>
              setNewServiceProviderId(e.target.value)
            }
          >
            <option value="">
              {lang === "es"
                ? "Disponible para todos"
                : "Available for all"}
            </option>

            {providers.map((provider) => (
              <option
                key={provider.id}
                value={provider.id}
              >
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={addService}
          disabled={savingService}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {savingService
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
            ? "Agregar Servicio"
            : "Add Service"}
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow p-4 space-y-3">
        {services.length === 0 ? (
          <p className="text-sm text-gray-500">
            {lang === "es"
              ? "No hay servicios agregados."
              : "No services added yet."}
          </p>
        ) : (
          services.map((service) => {
            const assignedProvider = providers.find(
              (p) => p.id === service.provider_id
            );

            return (
              <div
                key={service.id}
                className="border-b pb-4 last:border-none"
              >
                {editingServiceId === service.id ? (
                  <div className="space-y-3">
                    <input
                      className="border p-2 rounded w-full"
                      value={editServiceName}
                      onChange={(e) =>
                        setEditServiceName(e.target.value)
                      }
                      placeholder={
                        lang === "es"
                          ? "Nombre del servicio"
                          : "Service name"
                      }
                    />

                    <input
                      className="border p-2 rounded w-full"
                      value={editServiceDescription}
                      onChange={(e) =>
                        setEditServiceDescription(
                          e.target.value
                        )
                      }
                      placeholder={
                        lang === "es"
                          ? "Descripción"
                          : "Description"
                      }
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="border p-2 rounded w-full"
                      value={editServicePrice}
                      onChange={(e) =>
                        setEditServicePrice(e.target.value)
                      }
                      placeholder={
                        lang === "es"
                          ? "Precio RD$"
                          : "Price RD$"
                      }
                    />

                    <input
                      type="number"
                      min="1"
                      className="border p-2 rounded w-full"
                      value={editServiceDuration}
                      onChange={(e) =>
                        setEditServiceDuration(
                          e.target.value
                        )
                      }
                      placeholder={
                        lang === "es"
                          ? "Duración en minutos"
                          : "Duration in minutes"
                      }
                    />

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {lang === "es"
                          ? "Profesional"
                          : "Provider"}
                      </label>

                      <select
                        className="border p-2 rounded w-full"
                        value={editServiceProviderId}
                        onChange={(e) =>
                          setEditServiceProviderId(
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          {lang === "es"
                            ? "Disponible para todos"
                            : "Available for all"}
                        </option>

                        {providers.map((provider) => (
                          <option
                            key={provider.id}
                            value={provider.id}
                          >
                            {provider.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={updateService}
                        disabled={savingEditService}
                        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                      >
                        {savingEditService
                          ? lang === "es"
                            ? "Guardando..."
                            : "Saving..."
                          : lang === "es"
                          ? "Guardar"
                          : "Save"}
                      </button>

                      <button
                        onClick={cancelEditService}
                        disabled={savingEditService}
                        className="bg-gray-200 px-4 py-2 rounded"
                      >
                        {lang === "es"
                          ? "Cancelar"
                          : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {service.name}
                        </p>

                        {service.description && (
                          <p className="text-sm text-gray-500">
                            {service.description}
                          </p>
                        )}

                        {assignedProvider && (
                          <p className="text-xs text-gray-400 mt-1">
                            {lang === "es"
                              ? "Profesional:"
                              : "Provider:"}{" "}
                            {assignedProvider.name}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">
                          {service.price !== null
                            ? `RD$${Number(
                                service.price
                              ).toLocaleString(
                                "en-US"
                              )}`
                            : "-"}
                        </p>

                        <p className="text-sm text-gray-500">
                          {service.duration} min
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 gap-3">
                      <p className="text-xs">
                        {service.is_active ? (
                          <span className="text-green-600">
                            {lang === "es"
                              ? "Activo"
                              : "Active"}
                          </span>
                        ) : (
                          <span className="text-red-600">
                            {lang === "es"
                              ? "Inactivo"
                              : "Inactive"}
                          </span>
                        )}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            startEditService(service)
                          }
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
                        >
                          {lang === "es"
                            ? "Editar"
                            : "Edit"}
                        </button>

                        <button
                          onClick={() =>
                            toggleServiceActive(service)
                          }
                          className={`px-4 py-2 rounded text-sm text-white ${
                            service.is_active
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {service.is_active
                            ? lang === "es"
                              ? "Desactivar"
                              : "Deactivate"
                            : lang === "es"
                            ? "Activar"
                            : "Activate"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}