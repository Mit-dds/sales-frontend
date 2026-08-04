import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Project, UnitType, FloorPlan } from "@/types";
import { parseCompletionDate, getHandoverMonths } from "@/domain/dates";
import { Card, Button } from "@/components/ui";
import UnitTypeEditor from "./UnitTypeEditor";
import { useProjectStore } from "@/lib/store/useProjectStore";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api/apiClient";

interface ProjectFormProps {
  project: Project | null;
  onSave: () => void;
  onCancel: () => void;
}

const EMPTY_PROJECT: Project = {
  id: "",
  name: "",
  location: "Dubai",
  type: "Apartments",
  status: "Off-plan",
  completionDate: "",
  heroImage: null,
  bookingToken: 20000,
  day7Payment: 30000,
  primaryColor: "#1A3C6B",
  secondaryColor: "#A8C5E8",
  whyBuy: [],
  unitTypes: [],
  dpSplitOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  feeLabel: "DLD Registration Fee",
  feePct: 4,
  feeFixed: 2194,
  utilityAmount: 22000,
  parkingCost: 0,
  disclaimer: "Prices are subject to change. This offer is valid for 7 days.",
  masterPlan: null,
  floorPlans: {},
};

const STEPS = [
  { key: "basics", num: "1", label: "Basics" },
  { key: "unittypes", num: "2", label: "Unit Types" },
  { key: "masterplan", num: "3", label: "Master Plan" },
  { key: "why", num: "4", label: "Why Buy" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function F({
  lbl,
  flex,
  children,
}: {
  lbl: string;
  flex?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={flex ? "flex-1 min-w-0" : "mb-4"}>
      <label className="block text-[10px] font-sans text-navy-light tracking-[1.6px] uppercase mb-1.5">
        {lbl}
      </label>
      {children}
    </div>
  );
}

const isValidCompletionDate = (s: string) => {
  if (!s) return true;
  const val = s.trim().toUpperCase();
  const qPattern = /^Q[1-4]\s+\d{4}$/;
  if (qPattern.test(val)) return true;
  const mPattern = /^([A-Z]+)\s+(\d{4})$/;
  const match = val.match(mPattern);
  if (match) {
    const months = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    return months.includes(match[1]);
  }
  return false;
};

export default function ProjectForm({
  project,
  onSave,
  onCancel,
}: ProjectFormProps) {
  const [p, setP] = useState<Project>(() => {
    if (!project) return { ...EMPTY_PROJECT, id: `p_${Date.now()}` };
    return {
      ...EMPTY_PROJECT,
      ...project,
      status:
        project.status === "OffPlan"
          ? "Off-plan"
          : project.status || EMPTY_PROJECT.status,
      primaryColor:
        project.primaryColor && project.primaryColor.startsWith("#")
          ? project.primaryColor
          : EMPTY_PROJECT.primaryColor,
      secondaryColor:
        project.secondaryColor && project.secondaryColor.startsWith("#")
          ? project.secondaryColor
          : EMPTY_PROJECT.secondaryColor,
      dpSplitOptions: Array.isArray(project.dpSplitOptions)
        ? project.dpSplitOptions
        : EMPTY_PROJECT.dpSplitOptions,
      whyBuy: Array.isArray(project.whyBuy)
        ? project.whyBuy
        : EMPTY_PROJECT.whyBuy,
      unitTypes: Array.isArray(project.unitTypes)
        ? project.unitTypes
        : EMPTY_PROJECT.unitTypes,
    };
  });
  const isNew = !p.id || p.id.startsWith("p_");
  const [tab, setTab] = useState<StepKey>(() => {
    const saved = localStorage.getItem("reportage_active_editing_step");
    return (saved as StepKey) || "basics";
  });
  const [newWhy, setNewWhy] = useState("");
  const [editingUT, setEditingUT] = useState<string | "new" | null>(() => {
    return localStorage.getItem("reportage_active_editing_unittype_id") as
      | string
      | "new"
      | null;
  });

  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [masterFile, setMasterFile] = useState<File | null>(null);

  useEffect(() => {
    localStorage.setItem("reportage_active_editing_step", tab);
  }, [tab]);

  useEffect(() => {
    localStorage.setItem("reportage_active_editing_project", JSON.stringify(p));
  }, [p]);

  useEffect(() => {
    const fetchUnitTypesSummary = async () => {
      const isBackend = p.id && (p.id.startsWith("cm") || p.id.length > 5);
      if (tab === "unittypes" && isBackend && editingUT === null) {
        try {
          const response = await apiClient.get<{
            success: boolean;
            data: {
              unitTypes: any[];
            };
          }>(`projects/${p.id}/unit-types`);

          if (response.data.success) {
            const backendUTs = response.data.data.unitTypes;
            const mapped: UnitType[] = backendUTs.map((ut: any) => {
              const subtypesList = (ut.subtypes || []).map((s: any) => s.label);

              const floorPlansMap: Record<string, FloorPlan> = {};
              (ut.subtypes || []).forEach((s: any) => {
                if (s.hasFloorPlan) {
                  floorPlansMap[s.label] = {
                    name: `${s.label} Floor Plan`,
                    dataUrl: "has_file",
                    isImage: true,
                  };
                }
              });

              return {
                id: ut.id,
                label: ut.label || "",
                subtypes: subtypesList,
                paymentPlans: ut.paymentPlans || [],
                floorPlans: floorPlansMap,
              } as UnitType;
            });

            setP((prev) => ({
              ...prev,
              unitTypes: mapped,
            }));
          }
        } catch (err: any) {
          console.error("Failed to load unit types summary from server:", err);
        }
      }
    };

    fetchUnitTypesSummary();
  }, [tab, p.id, editingUT]);

  useEffect(() => {
    if (editingUT !== null) {
      localStorage.setItem("reportage_active_editing_unittype_id", editingUT);
    } else {
      localStorage.removeItem("reportage_active_editing_unittype_id");
    }
  }, [editingUT]);

  if (editingUT !== null) {
    const utData =
      editingUT === "new"
        ? ({
            id: `ut_${Date.now()}`,
            label: "",
            subtypes: [""],
            paymentPlans: [],
            floorPlans: {},
          } as UnitType)
        : p.unitTypes.find((x) => x.id === editingUT);
    if (!utData) {
      setEditingUT(null);
    } else {
      const otherUnitTypePlans = p.unitTypes
        .filter((x) => x.id !== editingUT)
        .filter((x) => x.paymentPlans && x.paymentPlans.length > 0)
        .map((x) => ({
          unitLabel: x.label || "Unnamed",
          plans: x.paymentPlans || [],
        }));
      return (
        <UnitTypeEditor
          unitType={utData}
          projectId={p.id}
          primaryColor={p.primaryColor || "#B8860B"}
          otherUnitTypePlans={otherUnitTypePlans}
          onSaveDraft={(saved) => {
            const updated = {
              ...p,
              unitTypes: p.unitTypes.some((x) => x.id === saved.id)
                ? p.unitTypes.map((x) => (x.id === saved.id ? saved : x))
                : [...p.unitTypes, saved],
            };
            setP(updated);
            if (editingUT === "new") {
              setEditingUT(saved.id);
            }
          }}
          onSave={(saved) => {
            const updated = {
              ...p,
              unitTypes: p.unitTypes.some((x) => x.id === saved.id)
                ? p.unitTypes.map((x) => (x.id === saved.id ? saved : x))
                : [...p.unitTypes, saved],
            };
            setP(updated);
            localStorage.removeItem("reportage_active_editing_unittype_data");
            localStorage.removeItem("reportage_active_editing_unittype_id");
            localStorage.removeItem("reportage_active_editing_unittype_tab");
            setEditingUT(null);
          }}
          onCancel={() => {
            localStorage.removeItem("reportage_active_editing_unittype_data");
            localStorage.removeItem("reportage_active_editing_unittype_id");
            localStorage.removeItem("reportage_active_editing_unittype_tab");
            setEditingUT(null);
          }}
        />
      );
    }
  }

  const pc = p.primaryColor || "#1A3C6B";
  const getRgbaColor = (hex: string, alpha: number) => {
    if (!hex || !hex.startsWith("#")) {
      return `rgba(26, 60, 107, ${alpha})`;
    }
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16) || 26;
    const g = parseInt(h.substring(2, 4), 16) || 60;
    const b = parseInt(h.substring(4, 6), 16) || 107;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const stepIdx = STEPS.findIndex((s) => s.key === tab);

  const hasBasics = !!p.name?.trim();
  const hasUnitTypes = (p.unitTypes || []).length > 0;

  const isStepEnabled = (key: StepKey) => {
    if (key === "basics") return true;
    if (key === "unittypes") return !isNew && hasBasics;
    if (key === "masterplan") return !isNew && hasBasics && hasUnitTypes;
    if (key === "why") return !isNew && hasBasics && hasUnitTypes;
    return false;
  };

  const u = (k: keyof Project, v: unknown) =>
    setP((prev) => ({ ...prev, [k]: v as never }));

  const normalizeProjectData = (proj: any): Project => {
    const getFileUrl = (path: string | null) => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const normalized = path.replace(/\\/g, "/");
      const idx = normalized.indexOf("uploads/");
      if (idx !== -1) {
        const rel = normalized.substring(idx);
        let root = (
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/"
        ).replace(/\/api\/?$/, "");
        if (root.endsWith("/")) {
          root = root.slice(0, -1);
        }
        return `${root}/${rel}`;
      }
      return path;
    };

    return {
      ...EMPTY_PROJECT,
      ...p,
      ...proj,
      id: proj.id,
      status: proj.status === "OffPlan" ? "Off-plan" : proj.status || p.status,
      heroImage: getFileUrl(proj.heroImagePath || proj.heroImage),
      masterPlan: proj.masterPlanPath
        ? {
            name: proj.masterPlanName || "Master Plan",
            dataUrl: getFileUrl(proj.masterPlanPath) || "",
            isImage:
              proj.masterPlanIsImage !== null ? !!proj.masterPlanIsImage : true,
          }
        : proj.masterPlan || p.masterPlan,
    };
  };

  const toggleSplit = (n: number) => {
    setP((prev) => ({
      ...prev,
      dpSplitOptions: prev.dpSplitOptions.includes(n)
        ? prev.dpSplitOptions.filter((x) => x !== n)
        : [...prev.dpSplitOptions, n].sort((a, b) => a - b),
    }));
  };

  const handleCancelClick = () => {
    if (stepIdx > 0) {
      setTab(STEPS[stepIdx - 1].key);
    } else {
      onCancel();
    }
  };

  const saveToStorage = async () => {
    if (p.completionDate && !isValidCompletionDate(p.completionDate)) {
      toast.error("Invalid Completion Date format. Expected e.g. Q4 2026 or Jan 2026");
      throw new Error("Invalid Completion Date");
    }
    const {
      name,
      location,
      type,
      status,
      completionDate,
      feeLabel,
      feePct,
      feeFixed,
      utilityAmount,
      parkingCost,
      bookingToken,
      primaryColor,
      secondaryColor,
      dpSplitOptions,
      disclaimer,
    } = p;
    const payload = {
      name: name || "",
      location: location || "",
      type: type || "Apartments",
      status: status || "Off-plan",
      completionDate: completionDate || "",
      day7Payment: 30000,
      feeLabel: feeLabel || "",
      feePct: feePct || 0,
      feeFixed: feeFixed || 0,
      utilityAmount: utilityAmount || 0,
      parkingCost: parkingCost || 0,
      bookingToken: bookingToken || 0,
      primaryColor: primaryColor || "#1A3C6B",
      secondaryColor: secondaryColor || "#A8C5E8",
      dpSplitOptions: (dpSplitOptions || []).filter((n) => n > 0),
      disclaimer: disclaimer || "",
    };

    try {
      const syncWhyBuyHighlights = async (projId: string) => {
        try {
          const res = await apiClient.post<{
            success: boolean;
            data: { project: any };
          }>(`projects/${projId}/why-buy`, { items: p.whyBuy });
          return res.data.success ? res.data.data.project : null;
        } catch (syncErr) {
          console.error("Failed to sync why buy items to server:", syncErr);
          return null;
        }
      };

      if (isNew) {
        const createdProject = await useProjectStore
          .getState()
          .createProject(payload);

        let updatedProject = createdProject;

        if (p.whyBuy && p.whyBuy.length > 0) {
          const synced = await syncWhyBuyHighlights(createdProject.id);
          if (synced) {
            updatedProject = synced;
          }
        }

        if (heroFile) {
          try {
            const formData = new FormData();
            formData.append("file", heroFile);
            const uploadRes = await apiClient.post<{
              success: boolean;
              data: { project: any };
            }>(`projects/${createdProject.id}/upload?type=hero`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            if (uploadRes.data.success) {
              updatedProject = uploadRes.data.data.project;
            }
          } catch (uploadErr) {
            console.error(
              "Failed to upload hero image after project creation:",
              uploadErr,
            );
          }
        }

        if (masterFile) {
          try {
            const formData = new FormData();
            formData.append("file", masterFile);
            const uploadRes = await apiClient.post<{
              success: boolean;
              data: { project: any };
            }>(
              `projects/${createdProject.id}/upload?type=master-plan`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );
            if (uploadRes.data.success) {
              updatedProject = uploadRes.data.data.project;
            }
          } catch (uploadErr) {
            console.error(
              "Failed to upload master plan after project creation:",
              uploadErr,
            );
          }
        }

        setHeroFile(null);
        setMasterFile(null);

        const finalProject = normalizeProjectData(updatedProject);
        setP(finalProject);
        localStorage.setItem(
          "reportage_active_editing_project",
          JSON.stringify(finalProject),
        );
      } else {
        const updatedProject = await useProjectStore
          .getState()
          .updateProject(p.id, payload);

        let finalProjectData = updatedProject;
        if (tab === "why") {
          const loadingId = toast.loading("Syncing highlights to server...");
          const synced = await syncWhyBuyHighlights(p.id);
          toast.dismiss(loadingId);
          if (synced) {
            finalProjectData = synced;
          }
        }

        const finalProject = normalizeProjectData(finalProjectData);
        setP(finalProject);
        localStorage.setItem(
          "reportage_active_editing_project",
          JSON.stringify(finalProject),
        );
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to save project to server";
      toast.error(msg);
      throw err;
    }
  };

  const handleSaveOnly = async () => {
    try {
      await saveToStorage();
      toast.success(`${STEPS[stepIdx].label} saved successfully`);
    } catch {}
  };

  const handleSaveAndNext = async () => {
    try {
      await saveToStorage();
      toast.success(`${STEPS[stepIdx].label} saved successfully`);
      setTab(STEPS[stepIdx + 1].key);
    } catch {}
  };

  const handleSaveAndFinish = async () => {
    try {
      await saveToStorage();
      toast.success("Project saved successfully");
      onSave();
    } catch {}
  };

  const handleFileUpload = async (
    key: "heroImage" | "masterPlan",
    file: File | null,
  ) => {
    if (!file) return;

    if (isNew) {
      if (key === "heroImage") {
        setHeroFile(file);
      } else {
        setMasterFile(file);
      }
      const reader = new FileReader();
      const isImg = /\.(jpg|jpeg|png)$/i.test(file.name);
      reader.onload = () => {
        if (key === "heroImage") {
          u("heroImage", reader.result as string);
        } else {
          u("masterPlan", {
            name: file.name,
            dataUrl: reader.result as string,
            isImage: isImg,
          });
        }
      };
      reader.readAsDataURL(file);
    } else {
      const loadingId = toast.loading(
        `Uploading ${key === "heroImage" ? "hero image" : "master plan"}...`,
      );
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadType = key === "heroImage" ? "hero" : "master-plan";

        const response = await apiClient.post<{
          success: boolean;
          data: { project: any };
        }>(`projects/${p.id}/upload?type=${uploadType}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        toast.dismiss(loadingId);
        if (response.data.success) {
          const updatedProject = response.data.data.project;
          setP(normalizeProjectData(updatedProject));
          toast.success(
            `${key === "heroImage" ? "Hero image" : "Master plan"} uploaded successfully`,
          );
        }
      } catch (err: any) {
        toast.dismiss(loadingId);
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to upload file to server";
        toast.error(msg);
      }
    }
  };

  const handleFileRemove = async (key: "heroImage" | "masterPlan") => {
    const uploadType = key === "heroImage" ? "hero" : "master-plan";

    if (!isNew && p.id) {
      const loadingId = toast.loading(
        `Removing ${key === "heroImage" ? "hero image" : "master plan"}...`,
      );
      try {
        const response = await apiClient.delete<{
          success: boolean;
          data: { project: any };
        }>(`projects/${p.id}/file?type=${uploadType}`);

        toast.dismiss(loadingId);
        if (response.data.success) {
          const updatedProject = response.data.data.project;
          setP(normalizeProjectData(updatedProject));
          u(key, null);
          toast.success(
            `${key === "heroImage" ? "Hero image" : "Master plan"} removed successfully`,
          );
        }
      } catch (err: any) {
        toast.dismiss(loadingId);
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to remove file from server";
        toast.error(msg);
      }
    } else {
      if (key === "heroImage") {
        setHeroFile(null);
      } else {
        setMasterFile(null);
      }
      u(key, null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-serif text-[26px] font-semibold text-navy">
          {p.name || "New Project"}
        </h1>
        <Button variant="outline" size="sm" onClick={handleCancelClick}>
          Back
        </Button>
      </div>

      {p.primaryColor && (
        <div
          className="h-[3px] rounded-sm mb-5"
          style={{
            background: `linear-gradient(90deg,${pc},${p.secondaryColor || "#aaa"})`,
          }}
        />
      )}

      <div className="flex items-center mb-7 bg-white rounded-[10px] px-3 sm:px-5 pt-4 pb-8 sm:pb-4 border border-border overflow-x-auto gap-2 scrollbar-none">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex items-center ${
              i < STEPS.length - 1 ? "flex-1 min-w-0" : "shrink-0"
            }`}
          >
            <div
              onClick={() => {
                if (isStepEnabled(s.key)) {
                  setTab(s.key);
                }
              }}
              className={`relative flex items-center gap-2 shrink-0 transition-all ${
                isStepEnabled(s.key)
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{
                  background:
                    tab === s.key ? pc : stepIdx > i ? "#1A8A5A" : "#D0DCF0",
                  color: tab === s.key || stepIdx > i ? "#fff" : "#4A5880",
                }}
              >
                {stepIdx > i ? "✓" : s.num}
              </div>
              <span
                className={`text-[11px] sm:text-xs whitespace-nowrap ${
                  tab === s.key
                    ? "block absolute top-9 left-1/2 -translate-x-1/2 sm:static sm:translate-x-0"
                    : "hidden sm:block"
                }`}
                style={{
                  fontWeight: tab === s.key ? 700 : 400,
                  color: tab === s.key ? pc : "#4A5880",
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-[2px] mx-2 sm:mx-3 min-w-[12px]"
                style={{ background: stepIdx > i ? "#1A8A5A" : "#D0DCF0" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Basics */}
      {tab === "basics" && (
        <Card padding="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <F lbl="Project Name" flex>
              <input
                className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                value={p.name}
                onChange={(e) => u("name", e.target.value)}
                placeholder="e.g. Verdana Residence"
              />
            </F>
            <F lbl="Location" flex>
              <select
                className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                value={p.location}
                onChange={(e) => u("location", e.target.value)}
              >
                {[
                  "Dubai",
                  "Abu Dhabi ADM",
                  "Abu Dhabi ADGM",
                  "Abu Dhabi BRABUS",
                ].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </F>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <F lbl="Property Type" flex>
              <select
                className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                value={p.type}
                onChange={(e) => u("type", e.target.value)}
              >
                {["Apartments", "Townhouses", "Mixed"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </F>
            <F lbl="Status" flex>
              <select
                className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                value={p.status}
                onChange={(e) => u("status", e.target.value)}
              >
                {["Off-plan", "Ready"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </F>
          </div>
          <F lbl="Completion Date">
            <input
              className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
              value={p.completionDate}
              onChange={(e) => u("completionDate", e.target.value)}
              placeholder="e.g. Q4 2026"
            />
            {p.completionDate && isValidCompletionDate(p.completionDate) && parseCompletionDate(p.completionDate) && (
              <div className="text-[11px] text-green mt-1.5">
                Handover:{" "}
                {parseCompletionDate(p.completionDate)!.toLocaleDateString(
                  "en-AE",
                  { month: "long", year: "numeric" },
                )}{" "}
                &mdash; {getHandoverMonths(p.completionDate)} months from today
              </div>
            )}
            {p.completionDate && !isValidCompletionDate(p.completionDate) && (
              <div className="text-[11px] text-red mt-1.5">
                Invalid format. Expected e.g. Q4 2026 or Jan 2026
              </div>
            )}
          </F>

          <div className="p-[14px_16px] bg-surface border border-border rounded-[6px] mb-4">
            <div className="text-[10px] font-sans text-navy-light tracking-[1.5px] uppercase mb-3">
              Registration & Fees
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <F lbl="Fee Label" flex>
                <input
                  className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                  value={p.feeLabel}
                  onChange={(e) => u("feeLabel", e.target.value)}
                  placeholder="e.g. DLD Registration Fee"
                />
              </F>
              <F lbl="Fee %" flex>
                <input
                  className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                  type="number"
                  step="0.1"
                  value={p.feePct}
                  onChange={(e) => u("feePct", +e.target.value)}
                  placeholder="4"
                />
              </F>
              <F lbl="Fixed Fee (AED)" flex>
                <input
                  className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                  type="number"
                  value={p.feeFixed}
                  onChange={(e) => u("feeFixed", +e.target.value)}
                  placeholder="2194"
                />
              </F>
              <F lbl="Utility (AED)" flex>
                <input
                  className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                  type="number"
                  value={p.utilityAmount}
                  onChange={(e) => u("utilityAmount", +e.target.value)}
                  placeholder="22000"
                />
              </F>
              <F lbl="Parking/Space (AED)" flex>
                <input
                  className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                  type="number"
                  value={p.parkingCost}
                  onChange={(e) => u("parkingCost", +e.target.value)}
                  placeholder="40000"
                />
                <div className="text-[10px] text-navy-dim mt-1">
                  Studio-2BR=1 space, 3BR+=2 spaces, TH=0
                </div>
              </F>
            </div>
          </div>

          <div className="p-[14px_16px] bg-surface border border-border rounded-[6px] mb-4">
            <div className="text-[10px] font-sans text-navy-light tracking-[1.5px] uppercase mb-3">
              Brand Colors
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
              <div>
                <div className="text-[10px] font-sans text-navy-light tracking-[1.6px] uppercase mb-1.5">
                  Primary
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={p.primaryColor}
                    onChange={(e) => u("primaryColor", e.target.value)}
                    className="w-12 h-[38px] rounded-[6px] border border-border cursor-pointer p-0.5 bg-transparent shrink-0"
                  />
                  <input
                    className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                    value={p.primaryColor}
                    onChange={(e) => u("primaryColor", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans text-navy-light tracking-[1.6px] uppercase mb-1.5">
                  Secondary
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={p.secondaryColor}
                    onChange={(e) => u("secondaryColor", e.target.value)}
                    className="w-12 h-[38px] rounded-[6px] border border-border cursor-pointer p-0.5 bg-transparent shrink-0"
                  />
                  <input
                    className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                    value={p.secondaryColor}
                    onChange={(e) => u("secondaryColor", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="text-[10px] font-sans text-navy-light tracking-[1.6px] uppercase mb-1.5">
                  Preview
                </div>
                <div
                  className="h-[38px] rounded-[6px] w-full"
                  style={{
                    background: `linear-gradient(135deg,${p.primaryColor},${p.secondaryColor || "#aaa"})`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-[10px] font-sans text-navy-light tracking-[1.6px] uppercase mb-1.5">
              DP Split Options Available to Agents
            </div>
            <div className="text-[11px] text-navy-dim mb-2.5">
              Select which split options agents can choose from (1-14 months)
            </div>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((n) => {
                const selected = p.dpSplitOptions.includes(n);
                return (
                  <div
                    key={n}
                    onClick={() => toggleSplit(n)}
                    className="px-4 py-2 rounded-[6px] cursor-pointer font-sans text-xs text-center min-w-[44px]"
                    style={{
                      border: selected
                        ? `2px solid ${pc}`
                        : "1px solid #D0DCF0",
                      background: selected ? getRgbaColor(pc, 0.12) : "#F0F4FA",
                      color: selected ? pc : "#4A5880",
                      fontWeight: selected ? 700 : 400,
                    }}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
            {p.dpSplitOptions.filter((n) => n > 0).length > 0 && (
              <div className="mt-2 text-[11px] text-green">
                Selected:{" "}
                {[...p.dpSplitOptions]
                  .filter((n) => n > 0)
                  .sort((a, b) => a - b)
                  .map((n) => `${n} month${n > 1 ? "s" : ""}`)
                  .join(", ")}
              </div>
            )}
          </div>

          <F lbl="Disclaimer">
            <textarea
              className="w-full px-3 py-2 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue resize-y min-h-[60px]"
              value={p.disclaimer}
              onChange={(e) => u("disclaimer", e.target.value)}
            />
          </F>

          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="text-[10px] font-sans text-navy-light tracking-[1.6px] uppercase mb-1.5">
                Booking Token (AED) &mdash; Day 0
              </div>
              <input
                className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
                type="number"
                value={p.bookingToken}
                onChange={(e) => u("bookingToken", +e.target.value)}
              />
              <div className="text-[10px] text-navy-dim mt-0.5">
                Fixed amount collected at reservation
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Unit Types */}
      {tab === "unittypes" && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 p-4 sm:p-[16px_20px] bg-white border border-border rounded-[10px] gap-3">
            <div>
              <div className="text-[13px] text-navy font-semibold">
                Unit Types
              </div>
              <div className="text-[12px] text-navy-dim mt-0.5">
                Each unit type has its own floor plans and payment plans.
              </div>
            </div>
            <button
              onClick={() => setEditingUT("new")}
              className="h-[38px] px-6 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-linear-to-r from-gold to-[#D4A84B] whitespace-nowrap"
            >
              + Add Unit Type
            </button>
          </div>

          {p.unitTypes.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
              {p.unitTypes.map((ut) => {
                const fpCount = Object.values(ut.floorPlans || {}).filter(
                  Boolean,
                ).length;
                const ppCount = (ut.paymentPlans || []).length;
                return (
                  <div
                    key={ut.id}
                    className="bg-white border border-border rounded-[10px] p-4 border-t-3"
                    style={{ borderTopColor: pc }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-serif text-lg font-semibold text-navy">
                          {ut.label || "Unnamed"}
                        </div>
                        {ut.subtypes &&
                          ut.subtypes.filter(Boolean).length > 0 && (
                            <div className="text-[12px] text-navy-light">
                              {ut.subtypes.filter(Boolean).join(", ")}
                            </div>
                          )}
                      </div>
                      <div className="flex gap-1 flex-col items-end">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-sans border ${fpCount > 0 ? "bg-green-dim text-green border-[rgba(26,138,90,0.3)]" : "bg-red-dim text-red border-[rgba(192,57,43,0.3)]"}`}
                        >
                          {fpCount > 0 ? `${fpCount} FP` : "No FP"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-sans border ${ppCount > 0 ? "bg-blue-dim text-blue border-[rgba(30,111,217,0.3)]" : "bg-orange-dim text-orange border-[rgba(200,100,10,0.3)]"}`}
                        >
                          {ppCount > 0 ? `${ppCount} plans` : "No plans"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const isBackend =
                            p.id && (p.id.startsWith("cm") || p.id.length > 5);
                          const isBackendUt =
                            ut.id &&
                            (ut.id.startsWith("cm") || ut.id.length > 5);

                          if (isBackend && isBackendUt) {
                            try {
                              const loadingId = toast.loading(
                                "Loading fresh unit type details...",
                              );
                              const res = await apiClient.get<{
                                success: boolean;
                                data: { unitType: any };
                              }>(`projects/${p.id}/unit-types/${ut.id}`);
                              toast.dismiss(loadingId);

                              if (res.data.success) {
                                const backendUt = res.data.data.unitType;
                                const subtypesList = (
                                  backendUt.subtypes || []
                                ).map((st: any) => st.label);
                                const floorPlansMap: Record<string, FloorPlan> =
                                  {};
                                const getFileUrl = (path: string) => {
                                  if (path && !path.startsWith("http")) {
                                    let backendRoot = (
                                      import.meta.env.VITE_API_BASE_URL ||
                                      "http://localhost:3001/api/"
                                    ).replace(/\/api\/?$/, "");
                                    if (backendRoot.endsWith("/")) {
                                      backendRoot = backendRoot.slice(0, -1);
                                    }
                                    let relativePath = path;
                                    if (relativePath.startsWith("/")) {
                                      relativePath = relativePath.slice(1);
                                    }
                                    return `${backendRoot}/${relativePath}`;
                                  }
                                  return path;
                                };
                                (backendUt.subtypes || []).forEach(
                                  (st: any) => {
                                    if (st.floorPlanPath) {
                                      floorPlansMap[st.label] = {
                                        name:
                                          st.floorPlanName ||
                                          `${st.label} Floor Plan`,
                                        dataUrl:
                                          getFileUrl(st.floorPlanPath) || "",
                                        isImage:
                                          st.floorPlanIsImage !== null
                                            ? !!st.floorPlanIsImage
                                            : true,
                                      };
                                    }
                                  },
                                );

                                const mappedUt: UnitType = {
                                  id: backendUt.id,
                                  label: backendUt.label,
                                  subtypes: subtypesList,
                                  paymentPlans: backendUt.paymentPlans || [],
                                  floorPlans: floorPlansMap,
                                  virtualTour: backendUt.virtualTour || "",
                                };

                                setP((prev) => ({
                                  ...prev,
                                  unitTypes: prev.unitTypes.map((x) =>
                                    x.id === ut.id ? mappedUt : x,
                                  ),
                                }));
                              }
                            } catch (err: any) {
                              toast.error(
                                err.message ||
                                  "Failed to load unit type from server",
                              );
                            }
                          }

                          setEditingUT(ut.id);
                        }}
                        className="flex-1 py-[7px] px-3 rounded-[6px] text-[12px] cursor-pointer border border-border text-navy bg-white hover:bg-surface"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const isBackend =
                            p.id && (p.id.startsWith("cm") || p.id.length > 5);
                          const isBackendUt =
                            ut.id &&
                            (ut.id.startsWith("cm") || ut.id.length > 5);

                          if (isBackend && isBackendUt) {
                            try {
                              const loadingId = toast.loading(
                                "Deleting unit type on server...",
                              );
                              const res = await apiClient.delete<{
                                success: boolean;
                                message: string;
                              }>(`projects/${p.id}/unit-types/${ut.id}`);
                              toast.dismiss(loadingId);

                              if (res.data.success) {
                                toast.success("Unit type deleted successfully");
                              }
                            } catch (err: any) {
                              const msg =
                                err.response?.data?.message ||
                                err.message ||
                                "Failed to delete unit type on server";
                              toast.error(msg);
                              return;
                            }
                          }

                          setP((prev) => ({
                            ...prev,
                            unitTypes: prev.unitTypes.filter(
                              (x) => x.id !== ut.id,
                            ),
                          }));
                        }}
                        className="py-[7px] px-3 rounded-[6px] text-[12px] font-semibold cursor-pointer text-red hover:bg-red-dim"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-[10px] bg-white">
              <div className="font-serif text-xl text-navy mb-2">
                No unit types yet
              </div>
              <button
                onClick={() => setEditingUT("new")}
                className="h-[38px] px-6 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-linear-to-r from-gold to-[#D4A84B]"
              >
                + Add First Unit Type
              </button>
            </div>
          )}
        </div>
      )}

      {/* Master Plan & Hero Image */}
      {tab === "masterplan" && (
        <div className="space-y-4">
          <Card padding="p-6">
            <div className="text-[10px] font-sans text-navy-light tracking-[1.5px] uppercase mb-1.5">
              Hero Image
            </div>
            <div className="text-[12px] text-navy-dim mb-2.5">
              Cover page background (JPG/PNG).
            </div>
            {p.heroImage ? (
              <div className="relative rounded-[6px] overflow-hidden">
                <img
                  src={p.heroImage}
                  alt=""
                  className="w-full h-[140px] object-cover block"
                />
                <button
                  type="button"
                  onClick={() => handleFileRemove("heroImage")}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white border-none rounded px-2.5 py-1 text-xs cursor-pointer hover:bg-black/80 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="block border-2 border-dashed border-border rounded-[6px] p-4 text-center cursor-pointer bg-surface">
                <div className="text-[11px] text-navy mb-1">
                  Upload Hero Image
                </div>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload("heroImage", e.target.files?.[0] || null)
                  }
                />
              </label>
            )}
          </Card>

          <Card padding="p-6">
            <div className="text-[10px] font-sans text-navy-light tracking-[1.5px] uppercase mb-1.5">
              Master Plan
            </div>
            <div className="text-[12px] text-navy-dim mb-4">
              One master plan per project shown at end of every offer.
            </div>
            {p.masterPlan ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 p-[14px_16px] bg-green-dim border border-[rgba(26,138,90,0.2)] rounded-[6px]">
                <div className="flex-1">
                  <div className="text-[13px] text-navy font-medium break-all">
                    {p.masterPlan.name}
                  </div>
                  <div className="text-[11px] text-green mt-0.5">
                    Master plan uploaded
                  </div>
                </div>
                <div className="flex gap-2.5 items-center justify-end">
                  <label className="inline-flex items-center justify-center h-[34px] px-3 rounded-[6px] border border-border text-[12px] text-navy cursor-pointer bg-white hover:bg-surface whitespace-nowrap">
                    Replace
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          "masterPlan",
                          e.target.files?.[0] || null,
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleFileRemove("masterPlan")}
                    className="h-[34px] px-3 rounded-[6px] text-xs font-semibold cursor-pointer text-red hover:bg-red-dim transition-colors whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="block border-2 border-dashed border-border rounded-[6px] p-8 text-center cursor-pointer bg-surface">
                <div className="text-[28px] mb-2">Map</div>
                <div className="text-[15px] text-navy mb-1">
                  Upload Master Plan
                </div>
                <div className="text-[11px] text-navy-dim">
                  PDF, JPG, or PNG
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload("masterPlan", e.target.files?.[0] || null)
                  }
                />
              </label>
            )}
          </Card>
        </div>
      )}

      {/* Why Buy */}
      {tab === "why" && (
        <Card padding="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-sans text-navy-light tracking-[1.5px] uppercase">
              Why Buy Highlights
            </div>
            {/* <button
              onClick={async () => {
                if (isNew) {
                  const generated = generateWhyBuyPoints(p);
                  setP((prev) => {
                    const current = prev.whyBuy || [];
                    const filtered = generated.filter(
                      (g) => !current.includes(g),
                    );
                    return {
                      ...prev,
                      whyBuy: [...current, ...filtered],
                    };
                  });
                  toast.success(`${generated.length} highlights generated`);
                } else {
                  const loadingId = toast.loading(
                    "Generating AI highlights...",
                  );
                  try {
                    const response = await apiClient.get<{
                      success: boolean;
                      data: { suggestions: string[] };
                    }>(`projects/${p.id}/why-buy/ai-suggestions`);
                    toast.dismiss(loadingId);
                    if (response.data.success) {
                      const suggestions = response.data.data.suggestions || [];
                      setP((prev) => {
                        const current = prev.whyBuy || [];
                        const filtered = suggestions.filter(
                          (s) => !current.includes(s),
                        );
                        return {
                          ...prev,
                          whyBuy: [...current, ...filtered],
                        };
                      });
                      toast.success(
                        `${suggestions.length} highlights generated`,
                      );
                    }
                  } catch (err: any) {
                    toast.dismiss(loadingId);
                    const msg =
                      err.response?.data?.message ||
                      err.message ||
                      "Failed to generate highlights";
                    toast.error(msg);
                  }
                }
              }}
              className="h-[32px] px-3 rounded-[6px] text-xs font-semibold cursor-pointer border border-border text-navy-light bg-white hover:bg-surface"
            >
              Re-generate with AI
            </button> */}
          </div>
          {p.whyBuy.map((pt, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-[10px_14px] bg-surface border border-border rounded-[6px] mb-2"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white shrink-0"
                style={{ background: pc }}
              >
                ✓
              </div>
              <div className="flex-1 text-[13px] text-navy">
                {typeof pt === "string" ? pt : ""}
              </div>
              <button
                onClick={() =>
                  setP((prev) => ({
                    ...prev,
                    whyBuy: prev.whyBuy.filter((_, j) => j !== i),
                  }))
                }
                className="h-[34px] px-3 rounded-[6px] text-xs font-semibold cursor-pointer text-red hover:bg-red-dim"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2.5 mt-2">
            <input
              className="flex-1 h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
              value={newWhy}
              onChange={(e) => setNewWhy(e.target.value)}
              placeholder="e.g. DLD fee waiver"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newWhy.trim()) {
                  setP((prev) => ({
                    ...prev,
                    whyBuy: [...prev.whyBuy, newWhy.trim()],
                  }));
                  setNewWhy("");
                }
              }}
            />
            <button
              onClick={() => {
                if (newWhy.trim()) {
                  setP((prev) => ({
                    ...prev,
                    whyBuy: [...prev.whyBuy, newWhy.trim()],
                  }));
                  setNewWhy("");
                }
              }}
              className="h-[38px] px-6 rounded-[6px] text-sm font-bold cursor-pointer text-[#0f184f] bg-linear-to-r from-[#C9A84C] to-[#E4C97A] border-none"
            >
              Add
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 p-4 sm:p-[16px_20px] bg-white rounded-[10px] border border-border gap-3">
        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={onCancel}
            className="h-[38px] px-4 rounded-[6px] text-sm cursor-pointer border border-border text-red bg-white hover:bg-[#FFF5F5] transition-colors w-full sm:w-auto text-center"
          >
            Cancel
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full sm:w-auto">
          <button
            onClick={handleSaveOnly}
            className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-green hover:bg-[#15724C] border-none w-full sm:w-auto text-center"
          >
            Save {STEPS[stepIdx].label}
          </button>
          {stepIdx < STEPS.length - 1 && (
            <button
              onClick={handleSaveAndNext}
              className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-green hover:bg-[#15724C] border-none w-full sm:w-auto text-center"
            >
              Save & Next: {STEPS[stepIdx + 1].label}
            </button>
          )}
          {stepIdx === STEPS.length - 1 && (
            <button
              onClick={handleSaveAndFinish}
              className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-green hover:bg-[#15724C] border-none w-full sm:w-auto text-center"
            >
              Save & Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
