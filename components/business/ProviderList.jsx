"use client";

export default function ProviderList({
  providers,
  lang,

  editingProviderId,
  editProviderName,
  setEditProviderName,
  editProviderEmail,
  setEditProviderEmail,
  editProviderPhone,
  setEditProviderPhone,
  editProviderSpecialty,
  setEditProviderSpecialty,

  savingEditProvider,

  startEditProvider,
  cancelEditProvider,
  updateProvider,
  deleteProvider,

  // PROFESSIONAL PANEL ACCESS
  grantProviderAccess,
  grantingProviderAccessId,
}) {
  return (
    <div className="mt-4 border rounded-xl p-4 bg-white shadow space-y-4">
      {providers.map((provider) => {
        const hasPanelAccess =
          provider.dashboard_access === true &&
          provider.access_status === "active" &&
          Boolean(provider.user_id);

        const isGrantingAccess =
          grantingProviderAccessId === provider.id;

        return (
          <div
            key={provider.id}
            className="border-b pb-4 last:border-none"
          >
            {editingProviderId === provider.id ? (
              /* EDIT PROVIDER */
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    className="border p-2 rounded"
                    placeholder={lang === "es" ? "Nombre" : "Name"}
                    value={editProviderName}
                    onChange={(e) =>
                      setEditProviderName(e.target.value)
                    }
                  />

                  <input
                    className="border p-2 rounded"
                    placeholder={
                      lang === "es"
                        ? "Especialidad"
                        : "Specialty"
                    }
                    value={editProviderSpecialty}
                    onChange={(e) =>
                      setEditProviderSpecialty(e.target.value)
                    }
                  />

                  <input
                    className="border p-2 rounded"
                    placeholder="Email"
                    value={editProviderEmail}
                    onChange={(e) =>
                      setEditProviderEmail(e.target.value)
                    }
                  />

                  <input
                    className="border p-2 rounded"
                    placeholder={
                      lang === "es"
                        ? "Teléfono"
                        : "Phone"
                    }
                    value={editProviderPhone}
                    onChange={(e) =>
                      setEditProviderPhone(e.target.value)
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={updateProvider}
                    disabled={savingEditProvider}
                    className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {savingEditProvider
                      ? lang === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : lang === "es"
                      ? "Guardar"
                      : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelEditProvider}
                    disabled={savingEditProvider}
                    className="bg-gray-200 px-4 py-2 rounded"
                  >
                    {lang === "es"
                      ? "Cancelar"
                      : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              /* PROVIDER DISPLAY */
              <div>
                <p className="font-semibold">
                  {provider.name}
                </p>

                {provider.specialty && (
                  <p className="text-sm text-gray-500">
                    {provider.specialty}
                  </p>
                )}

                {provider.email && (
                  <p className="text-sm text-gray-500">
                    {provider.email}
                  </p>
                )}

                {provider.phone && (
                  <p className="text-sm text-gray-500">
                    {provider.phone}
                  </p>
                )}

                {/* PROFESSIONAL PANEL ACCESS */}
                <div className="mt-3">
                  {hasPanelAccess ? (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                      <span>✓</span>

                      <span>
                        {lang === "es"
                          ? "Acceso al panel activo"
                          : "Dashboard access active"}
                      </span>
                    </div>
                  ) : provider.email ? (
                    <button
                      type="button"
                      onClick={() =>
                        grantProviderAccess?.(provider)
                      }
                      disabled={
                        !grantProviderAccess ||
                        isGrantingAccess
                      }
                      className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGrantingAccess
                        ? lang === "es"
                          ? "Preparando acceso..."
                          : "Preparing access..."
                        : lang === "es"
                        ? "Dar acceso al panel"
                        : "Give dashboard access"}
                    </button>
                  ) : (
                    <p className="text-sm text-amber-600">
                      {lang === "es"
                        ? "Agrega un correo electrónico para darle acceso al panel."
                        : "Add an email address to give dashboard access."}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      startEditProvider(provider)
                    }
                    className="bg-blue-600 text-white px-3 py-1.5 rounded"
                  >
                    {lang === "es"
                      ? "Editar"
                      : "Edit"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteProvider(provider)
                    }
                    className="bg-red-600 text-white px-3 py-1.5 rounded"
                  >
                    {lang === "es"
                      ? "Eliminar"
                      : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {providers.length === 0 && (
        <p className="text-sm text-gray-500">
          {lang === "es"
            ? "No hay profesionales agregados."
            : "No providers added yet."}
        </p>
      )}
    </div>
  );
}