import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// 🔥 Bilingual dictionary
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
    selectStartEnd: "Seleccione hora de inicio y fin",
    fullDayReason: "Día completo bloqueado",
    vacationReason: "Vacaciones",
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
    selectStartEnd: "Select start and end time",
    fullDayReason: "Full day blocked",
    vacationReason: "Vacation",
  },
};

export default function BlockingPanel({ barber, lang }) {
  const tr = t[lang];

  const [blocks, setBlocks] = useState([]);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [fullDay, setFullDay] = useState(false);
  const [multiDay, setMultiDay] = useState(false);
  const [endDate, setEndDate] = useState("");

  // Load existing blocks + realtime
  useEffect(() => {
    loadBlocks();

    const channel = supabase
      .channel("blocks")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "barber_blocks" },
        () => loadBlocks()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "barber_blocks" },
        () => loadBlocks()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "barber_blocks" },
        () => loadBlocks()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function loadBlocks() {
    const { data } = await supabase
      .from("barber_blocks")
      .select("*")
      .eq("barber", barber)
      .order("date", { ascending: true });

    setBlocks(data || []);
  }

  async function createBlock() {
    if (!date) return alert(tr.selectDate);

    if (fullDay) {
      await supabase.from("barber_blocks").insert({
        barber,
        date,
        start_time: "00:00:00",
        end_time: "23:59:59",
        reason: reason || tr.fullDayReason,
      });
      return;
    }

    if (multiDay) {
      if (!endDate) return alert(tr.selectEndDate);

      const startDateObj = new Date(date);
      const endDateObj = new Date(endDate);

      const days = [];
      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }

      for (const d of days) {
        await supabase.from("barber_blocks").insert({
          barber,
          date: d.toISOString().split("T")[0],
          start_time: "00:00:00",
          end_time: "23:59:59",
          reason: reason || tr.vacationReason,
        });
      }

      return;
    }

    if (!start || !end) return alert(tr.selectStartEnd);

    await supabase.from("barber_blocks").insert({
      barber,
      date,
      start_time: start + ":00",
      end_time: end + ":00",
      reason,
    });
  }

  // ⭐ UPDATED deleteBlock()
  async function deleteBlock(id) {
    const { error } = await supabase
      .from("barber_blocks")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error deleting block / Error eliminando el bloqueo");
    } else {
      alert("Block removed / Bloque eliminado");
      loadBlocks(); // refresh instantly
    }
  }

  // ⭐ RETURN JSX
  return (
    <div className="mt-10 p-4 border rounded-lg bg-white shadow">
      <h2 className="text-xl font-bold mb-4">{tr.blockedTimes}</h2>

      {/* Create Block */}
      <div className="space-y-3 mb-6">
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

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

        {multiDay && (
          <input
            type="date"
            className="border p-2 rounded w-full"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        )}

        {!fullDay && !multiDay && (
          <>
            <input
              type="time"
              className="border p-2 rounded w-full"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <input
              type="time"
              className="border p-2 rounded w-full"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </>
        )}

        <input
          type="text"
          placeholder={tr.reason}
          className="border p-2 rounded w-full"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <button
          onClick={createBlock}
          className="bg-black text-white px-4 py-2 rounded w-full"
        >
          {tr.addBlock}
        </button>
      </div>

      {/* List Blocks */}
      <div>
        <h3 className="font-semibold mb-2">{tr.existing}</h3>
        {blocks.length === 0 && <p>{tr.none}</p>}

        {blocks.map((b) => (
          <div
            key={b.id}
            className="flex justify-between items-center border p-2 rounded mb-2"
          >
            <div>
              <p className="font-bold">{b.date}</p>
              <p>{b.start_time} → {b.end_time}</p>
              {b.reason && <p className="text-sm text-gray-500">{b.reason}</p>}
            </div>

            {/* ⭐ DELETE BUTTON — LANGUAGE SWITCHES AUTOMATICALLY */}
            <button
              onClick={() => deleteBlock(b.id)}
              className="text-red-600 underline cursor-pointer font-semibold"
            >
              {tr.delete}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
