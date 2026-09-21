"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const t = {
  es: {
    blockedTimes: "Bloqueos de Horario",
    date: "Fecha",
    fullDay: "Bloquear día completo",
    multiDay: "Bloquear varios días (vacaciones)",
    start: "Hora de inicio",
    end: "Hora de fin",
    reason: "Razón (opcional)",
    addBlock: "Agregar Bloqueo",
    existing: "Bloqueos Existentes",
    none: "No hay bloqueos.",
    delete: "Eliminar",
    selectDate: "Seleccione una fecha",
    selectEndDate: "Seleccione una fecha final",
    invalidEndDate: "La fecha final no puede ser anterior a la fecha inicial",
    selectStartEnd: "Seleccione hora de inicio y fin",
    invalidTime: "La hora final debe ser después de la hora inicial",
    fullDayReason: "Día completo bloqueado",
    vacationReason: "Vacaciones",
    added: "Bloqueo agregado correctamente",
    removed: "Bloqueo eliminado",
    error: "No se pudo guardar el bloqueo",
    fullDayDisplay: "Día completo",
    endDate: "Fecha final",
    saving: "Guardando...",
    deleteError: "Error eliminando el bloqueo",
  },

  en: {
    blockedTimes: "Blocked Times",
    date: "Date",
    fullDay: "Block full day",
    multiDay: "Block multiple days (vacation)",
    start: "Start time",
    end: "End time",
    reason: "Reason (optional)",
    addBlock: "Add Block",
    existing: "Existing Blocks",
    none: "No blocked times.",
    delete: "Delete",
    selectDate: "Select a date",
    selectEndDate: "Select an end date",
    invalidEndDate: "End date cannot be before start date",
    selectStartEnd: "Select start and end time",
    invalidTime: "End time must be after start time",
    fullDayReason: "Full day blocked",
    vacationReason: "Vacation",
    added: "Block added successfully",
    removed: "Block removed",
    error: "Could not save block",
    fullDayDisplay: "Full day",
    endDate: "End date",
    saving: "Saving...",
    deleteError: "Error deleting block",
  },
};

export default function ProviderBlockingPanel({
  providerId,
  lang = "es",
}) {
  const tr = t[lang] || t.es;

  const [blocks, setBlocks] = useState([]);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [fullDay, setFullDay] = useState(false);
  const [multiDay, setMultiDay] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!providerId) {
      setBlocks([]);
      return;
    }

    loadBlocks();

    const channel = supabase
      .channel(`provider-blocks-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "provider_blocks",
        },
        () => loadBlocks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId]);

  async function loadBlocks() {
    if (!providerId) return;

    const { data, error } = await supabase
      .from("provider_blocks")
      .select("*")
      .eq("provider_id", providerId)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Provider blocks loading error:", error);
      return;
    }

    setBlocks(data || []);
  }

  function resetForm() {
    setDate("");
    setStart("");
    setEnd("");
    setReason("");
    setFullDay(false);
    setMultiDay(false);
    setEndDate("");
  }

  // DISPLAY DATABASE TIME AS 12-HOUR AM/PM
  function formatTime12Hour(time) {
    if (!time) return "";

    const [hourString, minute] = String(time).split(":");
    const hour = Number(hourString);

    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${period}`;
  }

  async function createBlock() {
    if (!providerId) return;

    if (!date) {
      alert(tr.selectDate);
      return;
    }

    setSaving(true);

    try {
      // FULL DAY
      if (fullDay) {
        const { error } = await supabase
          .from("provider_blocks")
          .insert({
            provider_id: providerId,
            date,
            start_time: "00:00:00",
            end_time: "23:59:59",
            reason: reason.trim() || tr.fullDayReason,
          });

        if (error) {
          console.error("Provider full-day block error:", error);
          alert(tr.error);
          return;
        }

        await loadBlocks();
        resetForm();
        alert(tr.added);
        return;
      }

      // VACATION / MULTIPLE DAYS
      if (multiDay) {
        if (!endDate) {
          alert(tr.selectEndDate);
          return;
        }

        if (endDate < date) {
          alert(tr.invalidEndDate);
          return;
        }

        const rows = [];

        const current = new Date(`${date}T12:00:00`);
        const last = new Date(`${endDate}T12:00:00`);

        while (current <= last) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, "0");
          const day = String(current.getDate()).padStart(2, "0");

          rows.push({
            provider_id: providerId,
            date: `${year}-${month}-${day}`,
            start_time: "00:00:00",
            end_time: "23:59:59",
            reason: reason.trim() || tr.vacationReason,
          });

          current.setDate(current.getDate() + 1);
        }

        const { error } = await supabase
          .from("provider_blocks")
          .insert(rows);

        if (error) {
          console.error("Provider vacation block error:", error);
          alert(tr.error);
          return;
        }

        await loadBlocks();
        resetForm();
        alert(tr.added);
        return;
      }

      // PARTIAL-DAY BLOCK
      if (!start || !end) {
        alert(tr.selectStartEnd);
        return;
      }

      if (end <= start) {
        alert(tr.invalidTime);
        return;
      }

      const { error } = await supabase
        .from("provider_blocks")
        .insert({
          provider_id: providerId,
          date,
          start_time: `${start}:00`,
          end_time: `${end}:00`,
          reason: reason.trim() || null,
        });

      if (error) {
        console.error("Provider block error:", error);
        alert(tr.error);
        return;
      }

      await loadBlocks();
      resetForm();
      alert(tr.added);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBlock(id) {
    const { error } = await supabase
      .from("provider_blocks")
      .delete()
      .eq("id", id)
      .eq("provider_id", providerId);

    if (error) {
      console.error("Provider block delete error:", error);
      alert(tr.deleteError);
      return;
    }

    await loadBlocks();
    alert(tr.removed);
  }

  if (!providerId) {
    return null;
  }

  return (
    <div className="mt-5 p-4 border rounded-lg bg-white">
      <h2 className="text-xl font-bold mb-4">
        {tr.blockedTimes}
      </h2>

      {/* CREATE BLOCK */}
      <div className="space-y-3 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            {tr.date}
          </label>

          <input
            type="date"
            className="border p-2 rounded w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fullDay}
            onChange={() => {
              setFullDay(!fullDay);
              setMultiDay(false);
            }}
          />

          {tr.fullDay}
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={multiDay}
            onChange={() => {
              setMultiDay(!multiDay);
              setFullDay(false);
            }}
          />

          {tr.multiDay}
        </label>

        {/* VACATION END DATE */}
        {multiDay && (
          <div>
            <label className="block text-sm font-medium mb-1">
              {tr.endDate}
            </label>

            <input
              type="date"
              className="border p-2 rounded w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

        {/* PARTIAL-DAY START / END TIMES */}
        {!fullDay && !multiDay && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                {tr.start}
              </label>

              <input
                type="time"
                className="border p-2 rounded w-full"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {tr.end}
              </label>

              <input
                type="time"
                className="border p-2 rounded w-full"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </>
        )}

        {/* REASON */}
        <input
          type="text"
          placeholder={tr.reason}
          className="border p-2 rounded w-full"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <button
          type="button"
          onClick={createBlock}
          disabled={saving}
          className="bg-black text-white px-4 py-2 rounded w-full disabled:opacity-50"
        >
          {saving ? tr.saving : tr.addBlock}
        </button>
      </div>

      {/* EXISTING BLOCKS */}
      <div>
        <h3 className="font-semibold mb-2">
          {tr.existing}
        </h3>

        {blocks.length === 0 && <p>{tr.none}</p>}

        {blocks.map((block) => {
          const isFullDay =
            String(block.start_time).startsWith("00:00") &&
            String(block.end_time).startsWith("23:59");

          const isAutomaticFullDayReason =
            block.reason === "Día completo bloqueado" ||
            block.reason === "Full day blocked";

          return (
            <div
              key={block.id}
              className="flex justify-between items-center border p-2 rounded mb-2"
            >
              <div>
                {/* DATE */}
                <p className="font-bold">
                  {block.date}
                </p>

                {/* TIME */}
                <p>
                  {isFullDay
                    ? tr.fullDayDisplay
                    : `${formatTime12Hour(
                        block.start_time
                      )} → ${formatTime12Hour(
                        block.end_time
                      )}`}
                </p>

                {/* REASON */}
                {block.reason && !isAutomaticFullDayReason && (
                  <p className="text-sm text-gray-500">
                    {block.reason}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => deleteBlock(block.id)}
                className="text-red-600 underline cursor-pointer font-semibold"
              >
                {tr.delete}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}