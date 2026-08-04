import { useState, useEffect } from "react";
import type { Project, FloorPlan } from "@/types";
import { getHandoverMonths } from "@/domain/dates";
import { ConfirmDialog } from "@/components/ui";
import ProjectForm from "./ProjectForm";
import { useProjectStore } from "@/lib/store/useProjectStore";
import { toast } from "sonner";

export default function AdminProjects() {
  const { fetchProjects, loading, error, deleteProject, fetchProjectById, projects: backendProjects } = useProjectStore();
  const [editing, setEditing] = useState<Project | null>(() => {
    const saved = localStorage.getItem("reportage_active_editing_project");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useEffect(() => {
    fetchProjects({ page: 1, limit: 20 });
    return () => {
      localStorage.removeItem("reportage_active_editing_project");
      localStorage.removeItem("reportage_active_editing_step");
      localStorage.removeItem("reportage_active_editing_unittype_data");
      localStorage.removeItem("reportage_active_editing_unittype_id");
      localStorage.removeItem("reportage_active_editing_unittype_tab");
    };
  }, [fetchProjects]);

  const handleSave = () => {
    localStorage.removeItem("reportage_active_editing_project");
    localStorage.removeItem("reportage_active_editing_step");
    localStorage.removeItem("reportage_active_editing_unittype_data");
    localStorage.removeItem("reportage_active_editing_unittype_id");
    localStorage.removeItem("reportage_active_editing_unittype_tab");
    fetchProjects({ page: 1, limit: 20 });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      toast.success("Project deleted successfully");
      fetchProjects({ page: 1, limit: 20 });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
    } finally {
      setDeleteTarget(null);
    }
  };

  const mapBackendProjectToFrontend = (bp: any): Project => {
    const getFileUrl = (path: string | null) => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      if (path.startsWith("data:")) return path;
      const normalized = path.replace(/\\/g, "/");
      const uploadsIdx = normalized.indexOf("uploads/");
      if (uploadsIdx !== -1) {
        const relativePath = normalized.substring(uploadsIdx);
        let backendRoot = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/").replace(/\/api\/?$/, "");
        if (backendRoot.endsWith("/")) {
          backendRoot = backendRoot.slice(0, -1);
        }
        return `${backendRoot}/${relativePath}`;
      }
      return path;
    };

    const mappedUnitTypes = (bp.unitTypes || []).map((ut: any) => {
      const subtypesList = (ut.subtypes || []).map((st: any) => st.label);
      const floorPlansMap: Record<string, FloorPlan> = {};
      (ut.subtypes || []).forEach((st: any) => {
        if (st.floorPlanPath) {
          floorPlansMap[st.label] = {
            name: st.floorPlanName || `${st.label} Floor Plan`,
            dataUrl: getFileUrl(st.floorPlanPath) || "",
            isImage: st.floorPlanIsImage !== null ? !!st.floorPlanIsImage : true,
          };
        }
      });

      return {
        id: ut.id,
        label: ut.label,
        subtypes: subtypesList,
        paymentPlans: ut.paymentPlans || [],
        floorPlans: floorPlansMap,
        virtualTour: ut.virtualTour || "",
      };
    });

    return {
      ...bp,
      heroImage: getFileUrl(bp.heroImagePath),
      masterPlan: bp.masterPlanPath ? {
        name: bp.masterPlanName || "Master Plan",
        dataUrl: getFileUrl(bp.masterPlanPath) || "",
        isImage: bp.masterPlanIsImage !== null ? !!bp.masterPlanIsImage : true,
      } : null,
      unitTypes: mappedUnitTypes,
      whyBuy: bp.whyBuy || [],
    };
  };

  const handleEditClick = async (p: any) => {
    const isBackend = p.id && (p.id.startsWith("cm") || p.id.length > 5);
    if (isBackend) {
      try {
        const projectData = await fetchProjectById(p.id);
        const mapped = mapBackendProjectToFrontend(projectData);
        setEditing(mapped);
        localStorage.setItem("reportage_active_editing_project", JSON.stringify(mapped));
        localStorage.setItem("reportage_active_editing_step", "basics");
      } catch {
        toast.error("Failed to load project details from database");
      }
    } else {
      setEditing(p);
      localStorage.setItem("reportage_active_editing_project", JSON.stringify(p));
      localStorage.setItem("reportage_active_editing_step", "basics");
    }
  };

  const createNew = () => {
    const newProj = {} as Project;
    setEditing(newProj);
    localStorage.setItem("reportage_active_editing_project", JSON.stringify(newProj));
    localStorage.setItem("reportage_active_editing_step", "basics");
  };

  if (editing) {
    return (
      <ProjectForm
        project={editing?.id ? editing : null}
        onSave={handleSave}
        onCancel={() => {
          localStorage.removeItem("reportage_active_editing_project");
          localStorage.removeItem("reportage_active_editing_step");
          localStorage.removeItem("reportage_active_editing_unittype_data");
          localStorage.removeItem("reportage_active_editing_unittype_id");
          localStorage.removeItem("reportage_active_editing_unittype_tab");
          setEditing(null);
        }}
      />
    );
  }

  const mergedProjects = backendProjects;

  return (
    <div>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Delete ${deleteTarget?.name}?`}
        detail="This will remove the project and all its units."
        confirmLabel="Delete"
        confirmColor="danger"
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif font-semibold text-[26px] text-navy">
          Projects
        </h1>
        <button
          onClick={createNew}
          className="h-[38px] px-5 rounded-[6px] text-sm font-bold cursor-pointer text-navy bg-linear-to-r from-[#C9A84C] to-[#E4C97A] border-none"
        >
          + New Project
        </button>
      </div>

      {loading && mergedProjects.length === 0 ? (
        <div className="text-center py-12 text-sm text-navy-dim font-sans">
          Loading projects...
        </div>
      ) : error && mergedProjects.length === 0 ? (
        <div className="text-center py-12 text-sm text-red font-sans">
          Error: {error}
        </div>
      ) : mergedProjects.length === 0 ? (
        <div className="text-center py-12 text-sm text-navy-dim font-sans">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {mergedProjects.map((p) => {
            const totalPlans = p.totalPlans !== undefined
              ? p.totalPlans
              : (p.unitTypes || []).reduce(
                  (s: number, ut: any) => s + (ut.paymentPlans || ut.planTypes || []).length,
                  0,
                );
            const unitTypesCount = p.unitTypeCount !== undefined
              ? p.unitTypeCount
              : (p.unitTypes || []).length;
            const whyBuyCount = p.whyBuyCount !== undefined
              ? p.whyBuyCount
              : (p.whyBuy || []).length;

            return (
              <div
                key={p.id}
                className="bg-white border border-border rounded-[10px] shadow-[0_2px_8px_rgba(30,60,120,0.06)] p-6 border-t-4"
                style={{ borderTopColor: p.primaryColor || "#B8860B" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-serif text-xl font-semibold text-navy">
                    {p.name}
                  </div>
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-sans border ${
                      p.status === "Off-plan"
                        ? "bg-[rgba(201,168,76,0.05)] text-[#C9A84C] border-[rgba(201,168,76,0.3)]"
                        : "bg-green-dim text-green border-[rgba(26,138,90,0.3)]"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="text-[12px] text-navy-dim mb-1">
                  {p.location} {p.type}
                </div>
                <div className="text-[12px] text-navy-dim mb-1">
                  {p.completionDate} {getHandoverMonths(p.completionDate)}mo from
                  today
                </div>
                <div className="text-[12px] text-navy-dim mb-3">
                  {totalPlans} plans {unitTypesCount} types
                </div>
                <div className="flex gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: p.primaryColor || "#B8860B" }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: p.secondaryColor || "#aaa" }}
                  />
                  {whyBuyCount > 0 && (
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-sans border bg-green-dim text-green border-[rgba(26,138,90,0.3)]">
                      {whyBuyCount} pts
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(p)}
                    className="flex-1 py-2 px-3 rounded-[6px] text-[12px] font-semibold cursor-pointer border border-border text-navy bg-white hover:bg-surface"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="py-2 px-3 rounded-[6px] text-[12px] font-semibold cursor-pointer border border-border text-red bg-white hover:bg-[#FFF5F5]"
                  >
                    Del
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
