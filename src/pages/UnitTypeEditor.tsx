import { useState, useEffect } from "react";
import type { UnitType, PaymentPlan, FloorPlan } from "@/types";
import { Card } from "@/components/ui";
import PaymentPlanForm from "./PaymentPlanForm";
import { TEMPLATE_PLANS } from "@/constants";
import { toast } from "sonner";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api/apiClient";

type TabKey = "details" | "plans" | "files";

interface UnitTypeEditorProps {
  unitType: UnitType;
  projectId: string;
  primaryColor: string;
  onSave: (updated: UnitType) => void;
  onCancel: () => void;
  onSaveDraft?: (updated: UnitType) => void;
  otherUnitTypePlans?: { unitLabel: string; plans: PaymentPlan[] }[];
}

export default function UnitTypeEditor({
  unitType,
  projectId,
  primaryColor,
  onSave,
  onCancel,
  onSaveDraft,
  otherUnitTypePlans,
}: UnitTypeEditorProps) {
  const [ut, setUt] = useState<UnitType>(() => {
    const saved = localStorage.getItem(
      "reportage_active_editing_unittype_data",
    );
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === unitType.id) {
          return parsed;
        }
      } catch {}
    }
    return {
      ...unitType,
      paymentPlans: unitType.paymentPlans || [],
      floorPlans: unitType.floorPlans || {},
      subtypes: unitType.subtypes?.length ? unitType.subtypes : [""],
    };
  });
  const [tab, setTab] = useState<TabKey>(() => {
    const saved = localStorage.getItem("reportage_active_editing_unittype_tab");
    return (saved as TabKey) || "details";
  });
  const [subtypeIdsByIndex, setSubtypeIdsByIndex] = useState<string[]>(() => {
    if (!unitType.id || unitType.id.startsWith("ut_")) {
      return (unitType.subtypes || [""]).map(() => "");
    }
    return [];
  });

  useEffect(() => {
    const loadInitialSubtypes = async () => {
      const isBackendProject =
        projectId && (projectId.startsWith("cm") || projectId.length > 5);
      const isBackendUt =
        unitType.id && (unitType.id.startsWith("cm") || unitType.id.length > 5);
      if (isBackendProject && isBackendUt) {
        try {
          const res = await apiClient.get<{
            success: boolean;
            data: { project: any };
          }>(`projects/${projectId}`);
          if (res.data.success) {
            const backendProject = res.data.data.project;
            const matchedUt = (backendProject.unitTypes || []).find(
              (x: any) => x.id === unitType.id,
            );
            if (matchedUt && matchedUt.subtypes) {
              const ids = matchedUt.subtypes.map((st: any) => st.id);
              setSubtypeIdsByIndex(ids);
            }
          }
        } catch (err) {
          console.error("Failed to load initial subtypes:", err);
        }
      }
    };
    loadInitialSubtypes();
  }, [unitType.id, projectId]);

  useEffect(() => {
    localStorage.setItem(
      "reportage_active_editing_unittype_data",
      JSON.stringify(ut),
    );
  }, [ut]);

  useEffect(() => {
    localStorage.setItem("reportage_active_editing_unittype_tab", tab);
  }, [tab]);

  useEffect(() => {
    const fetchFloorPlans = async () => {
      const isBackend =
        projectId && (projectId.startsWith("cm") || projectId.length > 5);
      const isBackendUt = ut.id && (ut.id.startsWith("cm") || ut.id.length > 5);
      if (tab === "files" && isBackend && isBackendUt) {
        try {
          const response = await apiClient.get<{
            success: boolean;
            data: {
              floorPlans: {
                id: string;
                label: string;
                floorPlanPath: string | null;
                floorPlanName: string | null;
                floorPlanIsImage: boolean | null;
              }[];
            };
          }>(`projects/${projectId}/unit-types/${ut.id}/floor-plans`);

          if (response.data.success) {
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

            const newFloorPlansMap: Record<string, FloorPlan> = {};
            response.data.data.floorPlans.forEach((fp) => {
              if (fp.floorPlanPath) {
                newFloorPlansMap[fp.label] = {
                  name: fp.floorPlanName || `${fp.label} Floor Plan`,
                  dataUrl: getFileUrl(fp.floorPlanPath) || "",
                  isImage:
                    fp.floorPlanIsImage !== null ? !!fp.floorPlanIsImage : true,
                };
              }
            });

            setUt((prev) => {
              const merged = { ...prev.floorPlans };
              Object.entries(newFloorPlansMap).forEach(([k, fp]) => {
                if (!merged[k]?.file) {
                  merged[k] = fp;
                }
              });
              return {
                ...prev,
                floorPlans: merged,
              };
            });
          }
        } catch (err: any) {
          console.error("Failed to fetch floor plans:", err);
        }
      }
    };

    fetchFloorPlans();
  }, [tab, projectId, ut.id]);

  const pc = primaryColor || "#B8860B";
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

  const u = (k: keyof UnitType, v: unknown) =>
    setUt((prev) => ({ ...prev, [k]: v as never }));

  const handleBackClick = () => {
    if (tab === "files") {
      setTab("plans");
    } else if (tab === "plans") {
      setTab("details");
    } else {
      onCancel();
    }
  };

  const handleSave = async (isFinish: boolean, nextTab?: TabKey) => {
    const isBackendProject =
      projectId && (projectId.startsWith("cm") || projectId.length > 5);
    const isNewUT = !ut.id || ut.id.startsWith("ut_");

    let currentUt = ut;

    if (isBackendProject && isNewUT) {
      try {
        const hasFiles = Object.values(ut.floorPlans || {}).some(
          (fp) => fp.file,
        );

        let response: { data: { success: boolean; data: { unitType: any } } };

        if (hasFiles) {
          const formData = new FormData();
          formData.append("label", ut.label || "Unnamed Unit Type");
          formData.append("virtualTour", ut.virtualTour || "");

          (ut.subtypes || [])
            .filter(Boolean)
            .forEach((label: string, index: number) => {
              formData.append(`subtypes[${index}][label]`, label);
              const fp = ut.floorPlans?.[label];
              if (fp?.file) {
                formData.append(
                  `subtypes[${index}][floorPlan]`,
                  fp.file,
                  fp.name,
                );
              }
            });

          response = await apiClient.post<{
            success: boolean;
            data: { unitType: any };
          }>(`projects/${projectId}/unit-types`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          const payload = {
            label: ut.label || "Unnamed Unit Type",
            subtypes: (ut.subtypes || [])
              .filter(Boolean)
              .map((label) => ({ label })),
            virtualTour: ut.virtualTour || "",
          };
          response = await apiClient.post<{
            success: boolean;
            data: { unitType: any };
          }>(`projects/${projectId}/unit-types`, payload);
        }

        if (response.data.success) {
          const backendUt = response.data.data.unitType;
          const subtypesList = (backendUt.subtypes || []).map(
            (st: any) => st.label,
          );
          const floorPlansMap: Record<string, FloorPlan> = {};
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
          (backendUt.subtypes || []).forEach((st: any) => {
            if (st.floorPlanPath) {
              floorPlansMap[st.label] = {
                name: st.floorPlanName || `${st.label} Floor Plan`,
                dataUrl: getFileUrl(st.floorPlanPath) || "",
                isImage:
                  st.floorPlanIsImage !== null ? !!st.floorPlanIsImage : true,
              };
            }
          });

          const ids = (backendUt.subtypes || []).map((st: any) => st.id);
          setSubtypeIdsByIndex(ids);

          let finalPlans = backendUt.paymentPlans || [];

          if (tab === "plans" || tab === "files") {
            const plansPayload = (ut.paymentPlans || []).map((p) => ({
              label: p.label || "Unnamed Plan",
              dp: Number(p.dp) || 0,
              installmentPct: Number(p.installmentPct) || 0,
              durationType: p.durationType || "till_handover",
              durationMonths:
                p.durationMonths !== null && p.durationMonths !== undefined
                  ? Number(p.durationMonths)
                  : null,
              discount: Number(p.discount) || 0,
              planType: p.planType || "normal",
              eventName: p.eventName || null,
              eventDiscount:
                p.eventDiscount !== null && p.eventDiscount !== undefined
                  ? Number(p.eventDiscount)
                  : null,
              eventInstallmentPct:
                p.eventInstallmentPct !== null &&
                p.eventInstallmentPct !== undefined
                  ? Number(p.eventInstallmentPct)
                  : null,
              eventDurationType: p.eventDurationType || "till_handover",
              eventDurationMonths:
                p.eventDurationMonths !== null &&
                p.eventDurationMonths !== undefined
                  ? Number(p.eventDurationMonths)
                  : null,
            }));

            const plansResponse = await apiClient.post<{
              success: boolean;
              data: { plans: any[] };
            }>(
              `projects/${projectId}/unit-types/${backendUt.id}/payment-plans`,
              {
                plans: plansPayload,
              },
            );

            if (plansResponse.data.success) {
              finalPlans = plansResponse.data.data.plans;
            }
          }

          const mapped: UnitType = {
            id: backendUt.id,
            label: backendUt.label,
            subtypes: subtypesList,
            paymentPlans: finalPlans,
            floorPlans: floorPlansMap,
            virtualTour: backendUt.virtualTour || "",
          };

          currentUt = mapped;
          setUt(mapped);
          localStorage.setItem(
            "reportage_active_editing_unittype_data",
            JSON.stringify(mapped),
          );
          localStorage.setItem(
            "reportage_active_editing_unittype_id",
            mapped.id,
          );
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to create unit type on server";
        toast.error(msg);
        throw err;
      }
    } else if (isBackendProject && !isNewUT) {
      try {
        const subtypesPayload = (ut.subtypes || [])
          .map((label, index) => {
            const id = subtypeIdsByIndex[index];
            return id ? { id, label } : { label };
          })
          .filter((x) => x.label);

        const hasFiles = Object.values(ut.floorPlans || {}).some(
          (fp) => fp.file,
        );

        let subtypesResPromise;

        if (hasFiles) {
          const formData = new FormData();
          (ut.subtypes || []).forEach((label, index) => {
            if (label) {
              const id = subtypeIdsByIndex[index];
              if (id) {
                formData.append(`subtypes[${index}][id]`, id);
              }
              formData.append(`subtypes[${index}][label]`, label);
              const fp = ut.floorPlans?.[label];
              if (fp?.file) {
                formData.append(
                  `subtypes[${index}][floorPlan]`,
                  fp.file,
                  fp.name,
                );
              }
            }
          });

          subtypesResPromise = apiClient.put<{
            success: boolean;
            data: {
              subtypes: any[];
            };
          }>(`projects/${projectId}/unit-types/${ut.id}/subtypes`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          subtypesResPromise = apiClient.put<{
            success: boolean;
            data: {
              subtypes: any[];
            };
          }>(`projects/${projectId}/unit-types/${ut.id}/subtypes`, {
            subtypes: subtypesPayload,
          });
        }

        const [utRes, subtypesRes] = await Promise.all([
          apiClient.put<{
            success: boolean;
            data: {
              unitType: any;
            };
          }>(`projects/${projectId}/unit-types/${ut.id}`, {
            label: ut.label,
            virtualTour: ut.virtualTour || "",
          }),
          subtypesResPromise,
        ]);

        if (utRes.data.success && subtypesRes.data.success) {
          const backendUt = utRes.data.data.unitType;
          const updatedSubtypes = subtypesRes.data.data.subtypes;

          const newIds = updatedSubtypes.map((st: any) => st.id);
          setSubtypeIdsByIndex(newIds);

          const subtypesList = updatedSubtypes.map((st: any) => st.label);

          const floorPlansMap: Record<string, FloorPlan> = {};
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
          updatedSubtypes.forEach((st: any) => {
            if (st.floorPlanPath) {
              floorPlansMap[st.label] = {
                name: st.floorPlanName || `${st.label} Floor Plan`,
                dataUrl: getFileUrl(st.floorPlanPath) || "",
                isImage:
                  st.floorPlanIsImage !== null ? !!st.floorPlanIsImage : true,
              };
            }
          });

          let finalPlans = ut.paymentPlans || [];

          if (tab === "plans" || tab === "files") {
            const plansPayload = (ut.paymentPlans || []).map((p) => ({
              label: p.label || "Unnamed Plan",
              dp: Number(p.dp) || 0,
              installmentPct: Number(p.installmentPct) || 0,
              durationType: p.durationType || "till_handover",
              durationMonths:
                p.durationMonths !== null && p.durationMonths !== undefined
                  ? Number(p.durationMonths)
                  : null,
              discount: Number(p.discount) || 0,
              planType: p.planType || "normal",
              eventName: p.eventName || null,
              eventDiscount:
                p.eventDiscount !== null && p.eventDiscount !== undefined
                  ? Number(p.eventDiscount)
                  : null,
              eventInstallmentPct:
                p.eventInstallmentPct !== null &&
                p.eventInstallmentPct !== undefined
                  ? Number(p.eventInstallmentPct)
                  : null,
              eventDurationType: p.eventDurationType || "till_handover",
              eventDurationMonths:
                p.eventDurationMonths !== null &&
                p.eventDurationMonths !== undefined
                  ? Number(p.eventDurationMonths)
                  : null,
            }));

            const plansResponse = await apiClient.post<{
              success: boolean;
              data: { plans: any[] };
            }>(`projects/${projectId}/unit-types/${ut.id}/payment-plans`, {
              plans: plansPayload,
            });

            if (plansResponse.data.success) {
              finalPlans = plansResponse.data.data.plans;
            }
          }

          currentUt = {
            ...currentUt,
            label: backendUt.label,
            virtualTour: backendUt.virtualTour || "",
            subtypes: subtypesList,
            floorPlans: floorPlansMap,
            paymentPlans: finalPlans,
          };
          setUt(currentUt);
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to update unit type on server";
        toast.error(msg);
        throw err;
      }
    }

    if (isFinish) {
      onSave(currentUt);
    } else {
      if (onSaveDraft) {
        onSaveDraft(currentUt);
      }
      if (nextTab) {
        setTab(nextTab);
      }
    }
  };

  const handleFileUpload = async (fpKey: string, file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    const isImg = /\.(jpg|jpeg|png)$/i.test(file.name);
    reader.onload = () => {
      setUt((prev) => ({
        ...prev,
        floorPlans: {
          ...prev.floorPlans,
          [fpKey]: {
            name: file.name,
            dataUrl: reader.result as string,
            isImage: isImg,
            file,
          },
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFloorPlan = (fpKey: string) => {
    const fp = { ...(ut.floorPlans || {}) };
    delete fp[fpKey];
    u("floorPlans", fp);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "details", label: "1 Details" },
    { key: "plans", label: "2 Payment Plans" },
    { key: "files", label: "3 Floor Plans" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-serif text-[26px] font-semibold text-navy">
          {ut.label || "New Unit Type"}
          {ut.subtypes?.filter(Boolean).length
            ? ` - ${ut.subtypes.filter(Boolean).join(", ")}`
            : ""}
        </h1>
        <button
          onClick={handleBackClick}
          className="h-[38px] px-6 rounded-[6px] text-xs cursor-pointer border border-border text-navy bg-white hover:bg-surface"
        >
          Back
        </button>
      </div>

      <div
        className="h-[3px] rounded-sm mb-5"
        style={{ background: `linear-gradient(90deg,${pc},transparent)` }}
      />

      <div className="flex gap-1 bg-surface border border-border rounded-[6px] p-1 mb-6 overflow-x-auto scrollbar-none whitespace-nowrap">
        {tabs.map((t) => (
          <div
            key={t.key}
            className="flex-1 text-center py-2.5 px-1 rounded-[6px] text-xs whitespace-nowrap"
            style={{
              background: tab === t.key ? getRgbaColor(pc, 0.12) : "#fff",
              color: tab === t.key ? pc : "#4A5880",
              fontWeight: tab === t.key ? 600 : 400,
              borderBottom:
                tab === t.key ? `2px solid ${pc}` : "2px solid transparent",
              boxShadow: tab === t.key ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t.label.split(" ")[0]}{" "}
            <span className={tab === t.key ? "inline" : "hidden sm:inline"}>
              {t.label.split(" ").slice(1).join(" ")}
            </span>
          </div>
        ))}
      </div>

      {/* Details */}
      {tab === "details" && (
        <Card padding="p-2 md:p-6">
          <div className="mb-4">
            <label className="block text-[10px] font-mono text-navy-light tracking-[1.6px] uppercase mb-1.5">
              Unit Type Label
            </label>
            <input
              className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
              value={ut.label}
              onChange={(e) => u("label", e.target.value)}
              placeholder="e.g. Studio, 1BR, 2BR, 3BR"
            />
          </div>

          <div className="mb-2">
            <label className="block text-[10px] font-mono text-navy-light tracking-[1.6px] uppercase mb-1.5">
              Sub Types & Floor Plans{" "}
              <span className="text-navy-dim font-normal tracking-normal text-[11px]">
                (name each sub type and upload its floor plan)
              </span>
            </label>
            {(ut.subtypes || [""]).map((st, i) => {
              const fpKey = (st || "").trim() || `subtype_${i}`;
              const existingFP = (ut.floorPlans || {})[fpKey];
              return (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row gap-2 mb-2.5 items-stretch sm:items-center p-[10px_14px] bg-surface rounded-[6px] border border-border"
                >
                  <input
                    className="flex-1 min-h-[36px] lg:min-h-0 lg:h-[38px] px-3 rounded-[6px] border border-border text-[14px] lg:text-[13px] text-navy bg-white outline-none focus:border-blue w-full"
                    value={st}
                    placeholder={`Sub Type ${String.fromCharCode(65 + i)}`}
                    onChange={(e) => {
                      const oldVal = (st || "").trim();
                      const newVal = (e.target.value || "").trim();

                      const s = [...(ut.subtypes || [""])];
                      s[i] = e.target.value;

                      const updatedFloorPlans = { ...(ut.floorPlans || {}) };
                      if (oldVal && updatedFloorPlans[oldVal]) {
                        if (newVal) {
                          updatedFloorPlans[newVal] = updatedFloorPlans[oldVal];
                        }
                        delete updatedFloorPlans[oldVal];
                      }

                      setUt((prev) => ({
                        ...prev,
                        subtypes: s,
                        floorPlans: updatedFloorPlans,
                      }));
                    }}
                  />
                  <div className="flex items-center justify-between gap-1.5 w-full sm:w-auto shrink-0">
                    {existingFP ? (
                      <div className="flex items-center justify-between gap-1.5 p-[6px_10px] bg-green-dim rounded-[6px] border border-[rgba(26,138,90,0.2)] w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[12px] font-bold">FP</span>
                          <span className="text-[11px] text-green truncate max-w-[120px] sm:max-w-[100px]">
                            {existingFP.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteFloorPlan(fpKey)}
                          className="text-[9px] font-semibold cursor-pointer text-red hover:bg-red-dim px-1.5 py-0.5 rounded shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-1.5 p-[6px_10px] bg-blue-dim rounded-[6px] border border-[rgba(30,111,217,0.2)] cursor-pointer text-[11px] text-blue whitespace-nowrap w-full sm:w-auto">
                        Upload PDF/JPG/PNG
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(fpKey, e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    )}
                    {(ut.subtypes || [""]).length > 1 && (
                      <button
                        onClick={async () => {
                          const subTypeId = subtypeIdsByIndex[i];
                          const isBackend =
                            projectId &&
                            (projectId.startsWith("cm") ||
                              projectId.length > 5);
                          const isBackendUt =
                            ut.id &&
                            (ut.id.startsWith("cm") || ut.id.length > 5);

                          if (isBackend && isBackendUt && subTypeId) {
                            try {
                              const loadingToastId = toast.loading(
                                "Deleting subtype on server...",
                              );
                              const response = await apiClient.delete<{
                                success: boolean;
                                message: string;
                              }>(
                                `projects/${projectId}/unit-types/${ut.id}/subtypes/${subTypeId}`,
                              );
                              toast.dismiss(loadingToastId);
                              if (response.data.success) {
                                toast.success("Subtype deleted successfully");
                              }
                            } catch (err: any) {
                              const msg =
                                err.response?.data?.message ||
                                err.message ||
                                "Failed to delete subtype on server";
                              toast.error(msg);
                              return;
                            }
                          }

                          const label = (ut.subtypes?.[i] || "").trim();
                          const s = [...(ut.subtypes || [])];
                          s.splice(i, 1);

                          const updatedFloorPlans = {
                            ...(ut.floorPlans || {}),
                          };
                          if (label && updatedFloorPlans[label]) {
                            delete updatedFloorPlans[label];
                          }

                          setUt((prev) => ({
                            ...prev,
                            subtypes: s,
                            floorPlans: updatedFloorPlans,
                          }));

                          setSubtypeIdsByIndex((prev) => {
                            const copy = [...prev];
                            copy.splice(i, 1);
                            return copy;
                          });
                        }}
                        className="p-2 text-xs font-semibold cursor-pointer text-red hover:bg-red-dim rounded shrink-0 flex items-center justify-center sm:hidden"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {(ut.subtypes || [""]).length > 1 && (
                    <button
                      onClick={async () => {
                        const subTypeId = subtypeIdsByIndex[i];
                        const isBackend =
                          projectId &&
                          (projectId.startsWith("cm") || projectId.length > 5);
                        const isBackendUt =
                          ut.id && (ut.id.startsWith("cm") || ut.id.length > 5);

                        if (isBackend && isBackendUt && subTypeId) {
                          try {
                            const loadingToastId = toast.loading(
                              "Deleting subtype on server...",
                            );
                            const response = await apiClient.delete<{
                              success: boolean;
                              message: string;
                            }>(
                              `projects/${projectId}/unit-types/${ut.id}/subtypes/${subTypeId}`,
                            );
                            toast.dismiss(loadingToastId);
                            if (response.data.success) {
                              toast.success("Subtype deleted successfully");
                            }
                          } catch (err: any) {
                            const msg =
                              err.response?.data?.message ||
                              err.message ||
                              "Failed to delete subtype on server";
                            toast.error(msg);
                            return;
                          }
                        }

                        const label = (ut.subtypes?.[i] || "").trim();
                        const s = [...(ut.subtypes || [])];
                        s.splice(i, 1);

                        const updatedFloorPlans = { ...(ut.floorPlans || {}) };
                        if (label && updatedFloorPlans[label]) {
                          delete updatedFloorPlans[label];
                        }

                        setUt((prev) => ({
                          ...prev,
                          subtypes: s,
                          floorPlans: updatedFloorPlans,
                        }));

                        setSubtypeIdsByIndex((prev) => {
                          const copy = [...prev];
                          copy.splice(i, 1);
                          return copy;
                        });
                      }}
                      className="p-2 text-xs font-semibold cursor-pointer text-red hover:bg-red-dim rounded shrink-0 hidden sm:flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => {
                const s = [...(ut.subtypes || [""]), ""];
                u("subtypes", s);
                setSubtypeIdsByIndex((prev) => [...prev, ""]);
              }}
              className="h-[34px] px-6 rounded-[6px] text-xs cursor-pointer border border-border text-navy bg-white hover:bg-surface mt-1"
            >
              + Add Sub Type
            </button>
          </div>

          <div className="mt-3.5">
            <label className="block text-[10px] font-mono text-navy-light tracking-[1.6px] uppercase mb-1.5">
              Virtual Tour Link (optional)
            </label>
            <input
              className="w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue"
              value={ut.virtualTour || ""}
              onChange={(e) => u("virtualTour", e.target.value)}
              placeholder="https://my.matterport.com/show/?m=..."
            />
          </div>
        </Card>
      )}

      {/* Payment Plans */}
      {tab === "plans" && (
        <Card padding="p-2 md:p-6">
          <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] uppercase mt-1 md:mb-1">
            Payment Plans for {(ut.label || "this unit type").toUpperCase()}
          </div>
          <div className="text-[12px] text-navy-dim mb-3">
            Plans specific to this unit type with their own discounts.
          </div>

          {(ut.paymentPlans || []).length === 0 && (
            <div className="p-4 rounded-[10px] border border-[#F3E6C4] bg-[#FFF9E6] flex items-center justify-between mb-4">
              <div>
                <div className="text-[12px] font-bold text-gold">
                  Load Standard Template Plans
                </div>
                <div className="text-[11px] text-navy-dim">
                  Start with 6 ready-made plans and edit discounts
                </div>
              </div>
              <button
                onClick={async () => {
                  const isBackend =
                    projectId &&
                    (projectId.startsWith("cm") || projectId.length > 5);
                  const isBackendUt =
                    ut.id && (ut.id.startsWith("cm") || ut.id.length > 5);

                  let templates = TEMPLATE_PLANS;

                  if (isBackend && isBackendUt) {
                    try {
                      const loadingId = toast.loading(
                        "Loading templates from server...",
                      );
                      const response = await apiClient.get<{
                        success: boolean;
                        data: {
                          templates: any[];
                        };
                      }>(
                        `projects/${projectId}/unit-types/${ut.id}/payment-plans/templates`,
                      );
                      toast.dismiss(loadingId);
                      if (response.data.success) {
                        templates = response.data.data.templates;
                      }
                    } catch {
                      toast.dismiss();
                      toast.error(
                        "Failed to load templates from server, falling back to local defaults",
                      );
                    }
                  }

                  const clonedTemplates = templates.map((tp) => ({
                    ...tp,
                    id: `pp_tp_${Date.now()}_${Math.random()}`,
                  }));
                  setUt((prev) => ({
                    ...prev,
                    paymentPlans: [
                      ...(prev.paymentPlans || []),
                      ...clonedTemplates,
                    ],
                  }));
                }}
                className="h-[38px] px-6 rounded-[6px] text-xs font-bold cursor-pointer text-navy bg-linear-to-r from-[#C9A84C] to-[#E4C97A] border-none"
              >
                Load All 7 Template Plans
              </button>
            </div>
          )}

          <PaymentPlanForm
            plans={ut.paymentPlans || []}
            onAdd={(plan) =>
              setUt((prev) => ({
                ...prev,
                paymentPlans: [...(prev.paymentPlans || []), plan],
              }))
            }
            onRemove={(id) => {
              setUt((prev) => ({
                ...prev,
                paymentPlans: (prev.paymentPlans || []).filter(
                  (x) => x.id !== id,
                ),
              }));
            }}
            onUpdate={(id, data) => {
              setUt((prev) => ({
                ...prev,
                paymentPlans: (prev.paymentPlans || []).map((x) =>
                  x.id === id ? { ...x, ...data } : x,
                ),
              }));
            }}
            primaryColor={pc}
            allUnitTypePlans={otherUnitTypePlans}
          />
        </Card>
      )}

      {/* Floor Plans */}
      {tab === "files" && (
        <Card padding="p-6">
          <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] uppercase mb-1.5">
            Floor Plans
          </div>
          <div className="text-[12px] text-navy-dim mb-2">
            Floor plans are uploaded per sub-type in the Details tab above.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(ut.floorPlans || {})
              .filter(([, fp]) => fp)
              .map(([k, fp]) => (
                <div
                  key={k}
                  className="flex flex-col gap-2 p-3 bg-[rgba(30,111,217,0.04)] border border-[rgba(30,111,217,0.15)] rounded-[8px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-navy">{k}</span>
                    <span className="text-[10px] font-semibold text-navy-dim uppercase tracking-wide">
                      {fp.isImage ? "Image" : "PDF"}
                    </span>
                  </div>
                  {fp.isImage && fp.dataUrl ? (
                    <div className="relative w-full h-[120px] rounded-[6px] overflow-hidden border border-border bg-[#F8FAFC] flex items-center justify-center">
                      <img
                        src={fp.dataUrl}
                        alt={fp.name}
                        className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[120px] rounded-[6px] border border-dashed border-border bg-[#F8FAFC] flex items-center justify-center text-[20px] font-bold text-navy-dim">
                      PDF
                    </div>
                  )}
                  <span
                    className="text-[11px] text-navy-dim truncate"
                    title={fp.name}
                  >
                    {fp.name}
                  </span>
                </div>
              ))}
            {Object.keys(ut.floorPlans || {}).length === 0 && (
              <div className="text-[12px] text-navy-dim">
                No floor plans uploaded yet. Go to Details tab to upload per
                sub-type.
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 p-4 sm:p-[16px_20px] bg-white rounded-[10px] border border-border gap-3">
        <button
          onClick={onCancel}
          className="h-[38px] px-6 rounded-[6px] text-xs cursor-pointer border border-border text-navy bg-white hover:bg-surface w-full sm:w-auto text-center"
        >
          Cancel
        </button>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => handleSave(false)}
            className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-linear-to-r from-green to-[#2ECC8A] w-full sm:w-auto text-center"
          >
            Save Unit Type
          </button>
          {tab === "details" && (
            <button
              onClick={() => handleSave(false, "plans")}
              className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-[#001367] w-full sm:w-auto text-center"
            >
              Save & Next: Payment Plans
            </button>
          )}
          {tab === "plans" && (
            <button
              onClick={() => handleSave(false, "files")}
              className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-[#001367] w-full sm:w-auto text-center"
            >
              Save & Next: Floor Plans
            </button>
          )}
          {tab === "files" && (
            <button
              onClick={() => handleSave(true)}
              className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-[#001367] w-full sm:w-auto text-center"
            >
              Save & Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
