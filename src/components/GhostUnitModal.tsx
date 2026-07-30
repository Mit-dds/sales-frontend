import { useState } from "react";
import { Modal } from "@/components/ui";
import type { Project, Unit, UnitType } from "@/types";

interface GhostUnitModalProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  onSubmit: (unit: Unit) => void;
}

export function GhostUnitModal({
  open,
  onClose,
  project,
  onSubmit,
}: GhostUnitModalProps) {
  const [num, setNum] = useState("");
  const [typeId, setTypeId] = useState(project.unitTypes?.[0]?.id || "");
  const [subtype, setSubtype] = useState("");
  const [floor, setFloor] = useState("");
  const [price, setPrice] = useState("");
  const [areaInternal, setAreaInternal] = useState("");
  const [areaExternal, setAreaExternal] = useState("");
  const [areaTotal, setAreaTotal] = useState("");

  const handleInternalChange = (val: string) => {
    setAreaInternal(val);
    const intVal = parseFloat(val) || 0;
    const extVal = parseFloat(areaExternal) || 0;
    setAreaTotal(String(intVal + extVal));
  };

  const handleExternalChange = (val: string) => {
    setAreaExternal(val);
    const intVal = parseFloat(areaInternal) || 0;
    const extVal = parseFloat(val) || 0;
    setAreaTotal(String(intVal + extVal));
  };

  const handleSubmit = () => {
    if (!num.trim()) return;
    onSubmit({
      id: `ghost_${Date.now()}`,
      number: num.trim(),
      projectId: project.id,
      typeId,
      floor: floor.trim() || (project.type === "Townhouses" ? "G" : "0"),
      areaInternal: areaInternal ? +areaInternal : 0,
      areaExternal: areaExternal ? +areaExternal : 0,
      area: areaTotal ? +areaTotal : 0,
      price: price ? +price : 0,
      subtype: subtype.trim(),
      isGhost: true,
    });
    setNum("");
    setTypeId(project.unitTypes?.[0]?.id || "");
    setSubtype("");
    setFloor("");
    setPrice("");
    setAreaInternal("");
    setAreaExternal("");
    setAreaTotal("");
  };

  const lblStyle =
    "block text-[10px] font-sans text-navy-light tracking-[1.6px] uppercase mb-1.5";
  const inpStyle =
    "w-full bg-[#F8FAFF] border border-border rounded-[6px] text-navy px-3.5 py-2.5 text-[13px] outline-none focus:border-blue transition-colors";

  const titleNode = (
    <div>
      <div className="text-[10px] font-sans text-gold tracking-[1.5px] mb-1">
        GHOST UNIT
      </div>
      <div className="font-serif text-[22px] font-semibold text-navy">
        Create Temporary Unit
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleNode}
      size="md"
      footer={
        <div className="flex w-full gap-3">
          <button
            className="flex-1 h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-navy-light bg-transparent border border-border hover:bg-surface transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-navy bg-linear-to-r from-[#C9A84C] to-[#E4C97A] disabled:opacity-50"
            disabled={!num.trim()}
            onClick={handleSubmit}
          >
            Create & Continue
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <div className={lblStyle}>Unit Number</div>
          <input
            className={inpStyle}
            placeholder="e.g. A-1204"
            value={num}
            onChange={(e) => setNum(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <div className={lblStyle}>Unit Type</div>
          <select
            className={`${inpStyle} cursor-pointer`}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            {(project.unitTypes || []).map((ut: UnitType) => (
              <option key={ut.id} value={ut.id}>
                {ut.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className={lblStyle}>Sub Type (Optional)</div>
          <input
            className={inpStyle}
            placeholder="e.g. Type A"
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={lblStyle}>Floor</div>
            <input
              className={inpStyle}
              placeholder="e.g. 12"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
          </div>
          <div>
            <div className={lblStyle}>Price (AED)</div>
            <input
              className={inpStyle}
              type="number"
              placeholder="e.g. 1500000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className={lblStyle}>Internal Area (sqft)</div>
            <input
              className={inpStyle}
              type="number"
              placeholder="e.g. 850"
              value={areaInternal}
              onChange={(e) => handleInternalChange(e.target.value)}
            />
          </div>
          <div>
            <div className={lblStyle}>External/Balcony (sqft)</div>
            <input
              className={inpStyle}
              type="number"
              placeholder="e.g. 100"
              value={areaExternal}
              onChange={(e) => handleExternalChange(e.target.value)}
            />
          </div>
          <div>
            <div className={lblStyle}>Total Area (sqft)</div>
            <input
              className={`${inpStyle} mt-4`}
              type="number"
              placeholder="e.g. 950"
              value={areaTotal}
              onChange={(e) => setAreaTotal(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
