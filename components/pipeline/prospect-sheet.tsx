"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Trash2, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AREA_DEFAULT,
  SIGNALS,
  STAGES,
  type Prospect,
  type Signal,
  type Stage,
} from "@/lib/pipeline/types";
import type { PipelineApi } from "@/lib/pipeline/use-pipeline";

/** null = closed · {mode:"add"} = new · {mode:"edit"} = editing an existing one. */
export type SheetState =
  | { mode: "add" }
  | { mode: "edit"; prospect: Prospect }
  | null;

export function ProspectSheet({
  state,
  api,
  onClose,
}: {
  state: SheetState;
  api: PipelineApi;
  onClose: () => void;
}) {
  const editing = state?.mode === "edit" ? state.prospect : null;

  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState(AREA_DEFAULT);
  const [stage, setStage] = useState<Stage>("Warm");
  const [signal, setSignal] = useState<Signal | "">("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();

  // Re-seed the form each time the sheet opens or the target changes.
  useEffect(() => {
    if (!state) return;
    if (state.mode === "edit") {
      const p = state.prospect;
      setHandle(p.handle);
      setName(p.name ?? "");
      setArea(p.area);
      setStage(p.stage);
      setSignal(p.signal ?? "");
      setNextAction(p.nextAction ?? "");
      setNextActionDate(p.nextActionDate ?? "");
      setNotes(p.notes ?? "");
    } else {
      setHandle("");
      setName("");
      setArea(AREA_DEFAULT);
      setStage("Warm");
      setSignal("");
      setNextAction("");
      setNextActionDate("");
      setNotes("");
    }
    setError(undefined);
  }, [state]);

  function save() {
    const h = handle.trim().replace(/^@/, "");
    if (!h) {
      setError("Add an Instagram handle.");
      return;
    }
    const common = {
      handle: h,
      name: name.trim() || null,
      area: area.trim() || AREA_DEFAULT,
      stage,
      signal: (signal || null) as Signal | null,
      nextAction: nextAction.trim() || null,
      nextActionDate: nextActionDate || null,
      notes: notes.trim() || null,
    };
    if (editing) {
      api.updateProspect(editing.id, common);
      toast.success("Saved");
    } else {
      api.addProspect({
        handle: h,
        area: common.area,
        stage,
        name: common.name ?? undefined,
        signal: common.signal ?? undefined,
        nextAction: common.nextAction ?? undefined,
        nextActionDate: common.nextActionDate ?? undefined,
        notes: common.notes ?? undefined,
      });
      toast.success(`@${h} added to the pipeline`);
    }
    onClose();
  }

  function del() {
    if (!editing) return;
    api.deleteProspect(editing.id);
    toast.success(`@${editing.handle} removed`);
    onClose();
  }

  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      title={editing ? `@${editing.handle}` : "Add prospect"}
      description={
        editing ? "Update the stage, next step and notes." : "Save a new Instagram lead to the pipeline."
      }
      footer={
        <>
          {editing && (
            <Button variant="ghost" size="sm" onClick={del} className="mr-auto text-danger hover:text-danger">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {editing ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {editing ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <Input
          label="Instagram handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="buddys.bubbles"
          autoCapitalize="none"
          error={error}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Area" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Stage" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label="Signal" value={signal} onChange={(e) => setSignal(e.target.value as Signal | "")}>
            <option value="">—</option>
            {SIGNALS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Next action"
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="Send the reveal"
        />
        <Input
          label="Next action date"
          type="date"
          value={nextActionDate}
          onChange={(e) => setNextActionDate(e.target.value)}
        />
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Signal, pain, what they said…"
        />
      </div>
    </Modal>
  );
}
