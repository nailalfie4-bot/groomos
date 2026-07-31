"use client";

/**
 * Create / edit / delete a time-off block from the calendar. Mobile-first
 * bottom sheet. All-day (a day or range) or specific hours, optional label, and
 * — for teams — assigned to one groomer or the whole business.
 *
 * If the block overlaps existing bookings we WARN and list them, but never
 * delete or hide them: the groomer chooses to keep the bookings (Save) or back
 * out (Cancel). The public booking page then treats the block as unavailable.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarOff, Trash2, TriangleAlert } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { useStore } from "@/lib/mock/store";
import { appointmentsInBlock, timeOffInstants } from "@/lib/availability";
import { formatTime } from "@/lib/format";
import type { TimeOff } from "@/lib/types";

const LABEL_PRESETS = ["Holiday", "Training", "Personal", "Sick"];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TimeOffSheet({
  open,
  onClose,
  editing,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  editing?: TimeOff | null;
  defaultDate?: string;
}) {
  const { groomers, appointments, getGroomer, addTimeOff, updateTimeOff, deleteTimeOff } = useStore();

  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(defaultDate ?? todayStr());
  const [endDate, setEndDate] = useState(defaultDate ?? todayStr());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [label, setLabel] = useState("");
  const [groomerId, setGroomerId] = useState("");

  // (Re)initialise whenever the sheet opens or the edited block changes.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setAllDay(editing.allDay);
      setStartDate(editing.start.slice(0, 10));
      setEndDate(editing.end.slice(0, 10));
      setStartTime(editing.start.slice(11, 16) || "09:00");
      setEndTime(editing.end.slice(11, 16) || "17:00");
      setLabel(editing.label ?? "");
      setGroomerId(editing.groomerId ?? "");
    } else {
      setAllDay(true);
      setStartDate(defaultDate ?? todayStr());
      setEndDate(defaultDate ?? todayStr());
      setStartTime("09:00");
      setEndTime("17:00");
      setLabel("");
      setGroomerId("");
    }
  }, [open, editing, defaultDate]);

  const instants = useMemo(
    () => timeOffInstants({ allDay, startDate, endDate, startTime, endTime }),
    [allDay, startDate, endDate, startTime, endTime],
  );
  const invalid = new Date(instants.end).getTime() <= new Date(instants.start).getTime();

  // Bookings already inside this block (excluding the block being edited itself
  // isn't needed — appointments and time off are different records).
  const affected = useMemo(
    () =>
      invalid
        ? []
        : appointmentsInBlock(appointments, {
            start: instants.start,
            end: instants.end,
            groomerId: groomerId || null,
          }),
    [appointments, instants, groomerId, invalid],
  );

  function save() {
    if (invalid) {
      toast.error("The end must be after the start.");
      return;
    }
    const input = {
      groomerId: groomerId || null,
      start: instants.start,
      end: instants.end,
      allDay,
      label: label.trim() || undefined,
    };
    if (editing) {
      updateTimeOff(editing.id, input);
      toast.success("Time off updated");
    } else {
      addTimeOff(input);
      toast.success(affected.length ? "Time off saved — your bookings are kept" : "Time off saved");
    }
    onClose();
  }

  function remove() {
    if (!editing) return;
    deleteTimeOff(editing.id);
    toast.success("Time off removed");
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit time off" : "Add time off"}
      subtitle="Blocked on your calendar and closed on your booking page."
      footer={
        <>
          {editing ? (
            <Button variant="danger" size="md" onClick={remove} className="flex-1">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          )}
          <Button size="md" onClick={save} disabled={invalid} className="flex-1">
            {affected.length ? "Keep bookings & save" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-DEFAULT bg-surface-sunken px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <CalendarOff className="h-4 w-4 text-accent" /> All day
          </span>
          <Toggle checked={allDay} onChange={setAllDay} label="All day / full days" />
        </div>

        {allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" value={startDate} onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value > endDate) setEndDate(e.target.value);
            }} />
            <Input label="To" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input label="Date" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setEndDate(e.target.value); }} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="From" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <Input label="To" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}

        {invalid && <p className="text-sm text-danger">The end must be after the start.</p>}

        <div>
          <Input label="Label (optional)" value={label} placeholder="Holiday, Training…" onChange={(e) => setLabel(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LABEL_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setLabel(p)}
                className="rounded-full border border-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {groomers.length > 0 && (
          <Select label="Applies to" value={groomerId} onChange={(e) => setGroomerId(e.target.value)}>
            <option value="">The whole business</option>
            {groomers.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        )}

        {affected.length > 0 && (
          <div className="rounded-xl border border-warning-deep/30 bg-warning-soft/50 p-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-warning-deep">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {affected.length} booking{affected.length === 1 ? "" : "s"} already in this time
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              These are kept — nothing is cancelled or hidden. They&apos;ll still show on your calendar.
              New online bookings inside this block are blocked.
            </p>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {affected.slice(0, 6).map((a) => {
                const g = a.groomerId ? getGroomer(a.groomerId) : undefined;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-xs text-ink">
                    <span className="tabular-nums">
                      {new Date(a.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {formatTime(a.start)}
                    </span>
                    {g && <span className="text-ink-subtle">{g.name}</span>}
                  </li>
                );
              })}
              {affected.length > 6 && (
                <li className="text-xs text-ink-subtle">+ {affected.length - 6} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}
