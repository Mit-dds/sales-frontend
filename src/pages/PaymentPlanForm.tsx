import type { ReactNode } from "react";
import { useState } from "react";
import type { PaymentPlan } from "@/types";
import { TEMPLATE_PLANS } from "@/constants";
import { X } from "lucide-react";

interface PaymentPlanFormProps {
  plans: PaymentPlan[];
  onAdd: (plan: PaymentPlan) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<PaymentPlan>) => void;
  primaryColor: string;
  allUnitTypePlans?: { unitLabel: string; plans: PaymentPlan[] }[];
}

interface FormState {
  label: string;
  dp: string;
  installmentPct: string;
  durationType: "till_handover" | "fixed_months";
  durationMonths: string;
  discount: string;
  planType: "normal" | "event" | "both";
  eventName: string;
  eventDiscount: string;
  eventInstallmentPct: string;
  eventDurationType: "till_handover" | "fixed_months";
  eventDurationMonths: string;
}

const EMPTY_FORM: FormState = {
  label: "",
  dp: "",
  installmentPct: "",
  durationType: "till_handover",
  durationMonths: "",
  discount: "",
  planType: "normal",
  eventName: "",
  eventDiscount: "",
  eventInstallmentPct: "",
  eventDurationType: "till_handover",
  eventDurationMonths: "",
};

function calcHO(
  dp: string,
  inst: string,
  dtype: string,
  dmonths: string,
): number {
  const d = +dp || 0;
  const i = +inst || 0;
  if (i === 0) return Math.max(0, 100 - d);
  if (dtype === "fixed_months") {
    const m = +dmonths || 0;
    return Math.max(0, Math.round((100 - d - i * m) * 10) / 10);
  }
  return 0;
}

function F({
  lbl,
  flex,
  children,
}: {
  lbl: string;
  flex?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={flex ? "flex-1 min-w-[140px]" : "mb-4"}>
      <label className="block text-[10px] font-sans text-navy-light tracking-[1.6px] uppercase mb-1.5">
        {lbl}
      </label>
      {children}
    </div>
  );
}

export default function PaymentPlanForm({
  plans,
  onAdd,
  onRemove,
  onUpdate,
  primaryColor,
  allUnitTypePlans,
}: PaymentPlanFormProps) {
  const pc = primaryColor || "#B8860B";
  const [pp, setPP] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showClone, setShowClone] = useState(false);
  const [selectedClones, setSelectedClones] = useState<string[]>([]);

  const u = (k: keyof FormState, v: string) =>
    setPP((prev) => ({ ...prev, [k]: v }));

  const startEdit = (plan: PaymentPlan) => {
    setEditingId(plan.id);
    setPP({
      label: plan.label || "",
      dp: String(plan.dp ?? ""),
      installmentPct: String(plan.installmentPct ?? ""),
      durationType: plan.durationType || "till_handover",
      durationMonths: String(plan.durationMonths ?? ""),
      discount: String(plan.discount ?? ""),
      planType: plan.planType || "normal",
      eventName: plan.eventName || "",
      eventDiscount: String(plan.eventDiscount ?? ""),
      eventInstallmentPct: String(plan.eventInstallmentPct ?? ""),
      eventDurationType: plan.eventDurationType || "till_handover",
      eventDurationMonths: String(plan.eventDurationMonths ?? ""),
    });
  };

  const savePlan = () => {
    if (!pp.label || !pp.dp) return;
    const ho = calcHO(
      pp.dp,
      pp.installmentPct,
      pp.durationType,
      pp.durationMonths,
    );
    const data: PaymentPlan = {
      id: editingId || `pp_${Date.now()}`,
      label: pp.label,
      dp: +pp.dp,
      installmentPct: +pp.installmentPct || 0,
      onHandover: ho,
      durationType: pp.durationType,
      durationMonths: pp.durationMonths ? +pp.durationMonths : null,
      discount: +pp.discount || 0,
      planType: pp.planType || "normal",
      eventName: pp.eventName || "",
      eventDiscount: pp.eventDiscount ? +pp.eventDiscount : null,
      eventInstallmentPct: pp.eventInstallmentPct
        ? +pp.eventInstallmentPct
        : null,
      eventDurationType: pp.eventDurationType || "till_handover",
      eventDurationMonths: pp.eventDurationMonths
        ? +pp.eventDurationMonths
        : null,
    };
    if (editingId) {
      onUpdate(editingId, data);
      setEditingId(null);
    } else {
      onAdd(data);
    }
    setPP(EMPTY_FORM);
  };

  const inpCls =
    "w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue";
  const selCls =
    "w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue";

  return (
    <div>
      {plans.length > 0 && (
        <div className="overflow-x-auto border border-border rounded-[8px] mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface animate-fade-in">
                {["LABEL", "DP%", "INSTALL", "DURATION", "DISC%", "TYPE", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-[9px] text-left text-[11px] text-navy-light tracking-[1.4px] uppercase font-sans border-b-2 border-border whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {plans.map((x) => (
                <tr
                  key={x.id}
                  className="border-b border-border hover:bg-[#F8FAFF] transition-colors"
                >
                  <td className="px-3 py-[11px] text-[13px] text-navy whitespace-nowrap">
                    {x.label}
                  </td>
                  <td className="px-3 py-[11px] text-[13px] text-navy whitespace-nowrap">
                    {x.dp}%
                  </td>
                  <td className="px-3 py-[11px] text-[13px] text-navy whitespace-nowrap">
                    {x.installmentPct > 0 ? `${x.installmentPct}%/mo` : "None"}
                  </td>
                  <td className="px-3 py-[11px] text-[11px] text-navy-light whitespace-nowrap">
                    {x.durationType === "fixed_months"
                      ? `${x.durationMonths}mo`
                      : "Till HO"}
                  </td>
                  <td className="px-3 py-[11px] text-[13px] whitespace-nowrap">
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-sans border bg-green-dim text-green border-[rgba(26,138,90,0.3)]">
                      {x.discount}%
                    </span>
                  </td>
                  <td className="px-3 py-[11px] whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-sans border ${
                        x.planType === "normal"
                          ? "bg-blue-dim text-blue border-[rgba(30,111,217,0.3)]"
                          : x.planType === "event"
                            ? "bg-orange-dim text-orange border-[rgba(200,100,10,0.3)]"
                            : "bg-green-dim text-green border-[rgba(26,138,90,0.3)]"
                      }`}
                    >
                      {x.planType || "normal"}
                    </span>
                  </td>
                  <td className="px-3 py-[11px] whitespace-nowrap">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => startEdit(x)}
                        className="text-xs font-semibold cursor-pointer border border-border text-blue bg-white hover:bg-[rgba(30,111,217,0.04)] px-2 py-1 rounded-[6px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onRemove(x.id)}
                        className="text-xs font-semibold cursor-pointer border border-border text-red bg-white hover:bg-[rgba(192,57,43,0.04)] px-2.5 py-1 rounded-[6px]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-[14px_16px] bg-surface border border-border rounded-[6px]">
        <div className="text-[10px] font-sans text-navy-light tracking-[1.5px] uppercase mb-3">
          {editingId ? "EDITING PLAN" : "ADD PLAN"}
        </div>

        <div className="flex gap-2.5 flex-wrap mb-2.5">
          <F lbl="Label" flex>
            <input
              className={inpCls}
              placeholder="e.g. 30% DP + 1% Monthly"
              value={pp.label}
              onChange={(e) => u("label", e.target.value)}
            />
          </F>
          <F lbl="DP %" flex>
            <input
              className={inpCls}
              type="number"
              placeholder="30"
              value={pp.dp}
              onChange={(e) => u("dp", e.target.value)}
            />
          </F>
          <F lbl="Install %/mo" flex>
            <input
              className={inpCls}
              type="number"
              placeholder="1"
              value={pp.installmentPct}
              onChange={(e) => u("installmentPct", e.target.value)}
            />
          </F>
          <F lbl="Duration" flex>
            <select
              className={selCls}
              value={pp.durationType}
              onChange={(e) => {
                u("durationType", e.target.value);
                u("durationMonths", "");
              }}
            >
              <option value="till_handover">Till Handover</option>
              <option value="fixed_months">Fixed Months</option>
            </select>
          </F>
          {pp.durationType === "fixed_months" && (
            <F lbl="Months" flex>
              <input
                className={inpCls}
                type="number"
                placeholder="20"
                value={pp.durationMonths}
                onChange={(e) => u("durationMonths", e.target.value)}
              />
            </F>
          )}
          <F lbl="Discount %" flex>
            <input
              className={inpCls}
              type="number"
              placeholder="15"
              value={pp.discount}
              onChange={(e) => u("discount", e.target.value)}
            />
          </F>
          <F lbl="Plan Type" flex>
            <select
              className={selCls}
              value={pp.planType}
              onChange={(e) => u("planType", e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="event">Event/Special</option>
              <option value="both">Both</option>
            </select>
          </F>
        </div>

        {(pp.planType === "event" || pp.planType === "both") && (
          <div className="p-[10px_12px] bg-[rgba(200,100,10,0.08)] rounded-[6px] border border-[rgba(200,100,10,0.2)] mb-2.5">
            <div className="text-[10px] font-sans text-orange tracking-[1px] uppercase mb-2">
              Event Version
            </div>
            <div className="flex gap-2.5 flex-wrap">
              <F lbl="Event Name" flex>
                <input
                  className={inpCls}
                  placeholder="e.g. Cityscape 2026"
                  value={pp.eventName}
                  onChange={(e) => u("eventName", e.target.value)}
                />
              </F>
              <F lbl="Event Disc %" flex>
                <input
                  className={inpCls}
                  type="number"
                  value={pp.eventDiscount}
                  onChange={(e) => u("eventDiscount", e.target.value)}
                />
              </F>
              <F lbl="Event Install %" flex>
                <input
                  className={inpCls}
                  type="number"
                  value={pp.eventInstallmentPct}
                  onChange={(e) => u("eventInstallmentPct", e.target.value)}
                />
              </F>
            </div>
          </div>
        )}

        <div className="flex gap-2.5 flex-wrap items-center">
          <button
            onClick={savePlan}
            className="h-[38px] px-6 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-green hover:bg-[#15724C] border-none"
          >
            {editingId ? "Save Changes" : "+ Add Plan"}
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setPP(EMPTY_FORM);
              }}
              className="h-[38px] px-4 rounded-[6px] text-sm cursor-pointer border border-border text-navy bg-white hover:bg-surface"
            >
              Cancel
            </button>
          )}
          {!editingId && (
            <button
              onClick={() => setShowClone((s) => !s)}
              className="h-[38px] px-4 rounded-[6px] text-xs cursor-pointer border border-border text-navy bg-white hover:bg-surface"
            >
              Clone from another unit type
            </button>
          )}
        </div>

        {showClone && (
          <div className="p-[14px] bg-surface border border-border rounded-[6px] mt-3">
            <div className="text-[10px] font-sans text-navy-light tracking-[1.5px] uppercase mb-2.5">
              Select Plans to Clone (multi-select)
            </div>
            <div className="mb-3">
              <div className="text-[11px] text-gold font-semibold mb-1.5">
                Standard Template Plans
              </div>
              {TEMPLATE_PLANS.map((tp) => {
                const checked = selectedClones.includes(tp.id);
                return (
                  <div
                    key={tp.id}
                    onClick={() =>
                      setSelectedClones((prev) =>
                        checked
                          ? prev.filter((x) => x !== tp.id)
                          : [...prev, tp.id],
                      )
                    }
                    className="flex items-center gap-2.5 p-[8px_12px] rounded-[6px] mb-1 cursor-pointer"
                    style={{
                      background: checked
                        ? `rgba(${parseInt(pc.slice(1, 3), 16)},${parseInt(pc.slice(3, 5), 16)},${parseInt(pc.slice(5, 7), 16)},0.08)`
                        : "#fff",
                      border: `1px solid ${checked ? pc : "#D0DCF0"}`,
                    }}
                  >
                    <div
                      className="w-[18px] h-[18px] rounded border-2 shrink-0 flex items-center justify-center text-[11px] text-white"
                      style={{
                        borderColor: checked ? pc : "#D0DCF0",
                        background: checked ? pc : "transparent",
                      }}
                    >
                      {checked ? "✓" : ""}
                    </div>
                    <div className="text-[12px] text-navy flex-1">
                      {tp.label}{" "}
                      <span className="text-navy-dim">
                        ({tp.dp}% DP, {tp.discount}% disc)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {allUnitTypePlans &&
              allUnitTypePlans.map((grp) => (
                <div key={grp.unitLabel} className="mb-3">
                  <div
                    className="text-[11px] font-semibold mb-1.5"
                    style={{ color: pc }}
                  >
                    {grp.unitLabel}
                  </div>
                  {grp.plans.map((p) => {
                    const checked = selectedClones.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() =>
                          setSelectedClones((prev) =>
                            checked
                              ? prev.filter((x) => x !== p.id)
                              : [...prev, p.id],
                          )
                        }
                        className="flex items-center gap-2.5 p-[8px_12px] rounded-[6px] mb-1 cursor-pointer"
                        style={{
                          background: checked
                            ? `rgba(${parseInt(pc.slice(1, 3), 16)},${parseInt(pc.slice(3, 5), 16)},${parseInt(pc.slice(5, 7), 16)},0.08)`
                            : "#fff",
                          border: `1px solid ${checked ? pc : "#D0DCF0"}`,
                        }}
                      >
                        <div
                          className="w-[18px] h-[18px] rounded border-2 shrink-0 flex items-center justify-center text-[11px] text-white"
                          style={{
                            borderColor: checked ? pc : "#D0DCF0",
                            background: checked ? pc : "transparent",
                          }}
                        >
                          {checked ? "✓" : ""}
                        </div>
                        <div className="text-[12px] text-navy">
                          {p.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            <div className="flex gap-2.5 mt-3">
              <button
                onClick={() => {
                  const allSrc = TEMPLATE_PLANS.concat(
                    (allUnitTypePlans || []).reduce(
                      (a, g) => a.concat(g.plans),
                      [] as PaymentPlan[],
                    ),
                  );
                  selectedClones.forEach((id) => {
                    const p = allSrc.find((x) => x.id === id);
                    if (p)
                      onAdd({ ...p, id: `pp_${Date.now()}_${Math.random()}` });
                  });
                  setSelectedClones([]);
                  setShowClone(false);
                }}
                className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-green hover:bg-[#15724C] border-none"
              >
                Clone Selected{" "}
                {selectedClones.length > 0 ? `(${selectedClones.length})` : ""}
              </button>
              <button
                onClick={() => {
                  setShowClone(false);
                  setSelectedClones([]);
                }}
                className="h-[38px] px-4 rounded-[6px] text-sm cursor-pointer border border-border text-navy bg-white hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
