import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type {
  Project,
  Unit,
  PaymentPlan,
  UnitType,
  Settings,
  FloorPlan,
} from "@/types";
import { useAuth } from "@/app/providers/AuthProvider";
import { settingsService } from "@/services/settings.service";
import { fmtAED, fmtUSD } from "@/domain/currency";
import { getHandoverMonths, fmtDate } from "@/domain/dates";
import { buildSchedule } from "@/domain/schedule";
import { buildRecoverySchedule } from "@/domain/recovery";
import { calcParking } from "@/domain/fees";

const watermarkToDataUrl = async (
  path: string | null,
): Promise<string | null> => {
  if (!path) return null;
  if (path.startsWith("data:")) return path;
  const url = path.startsWith("http")
    ? path
    : (() => {
        const normalized = path.replace(/\\/g, "/");
        const idx = normalized.indexOf("uploads/");
        if (idx === -1) return path;
        const rel = normalized.substring(idx);
        const root = (
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/"
        ).replace(/\/api\/?$/, "");
        return `${root.endsWith("/") ? root.slice(0, -1) : root}/${rel}`;
      })();
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const toDataUrl = async (url: string): Promise<string> => {
  if (url.startsWith("data:")) return url;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};

const ensurePdfDataUrl = async (
  item: { dataUrl?: string; isImage?: boolean } | null | undefined,
) => {
  if (!item || typeof item !== "object" || !item.dataUrl) return null;
  if (item.isImage || item.dataUrl.startsWith("data:")) return item;
  try {
    const dataUrl = await toDataUrl(item.dataUrl);
    return { ...item, dataUrl };
  } catch {
    return item;
  }
};

import {
  UTILITY,
  EXTRA_CURRENCIES,
  AED_TO_USD,
  DEFAULT_BOOKING_TOKEN,
  DEFAULT_DAY7_PAYMENT,
} from "@/constants";
import { storage, STORAGE_KEYS } from "@/lib/storage";
import type { UnitsMap } from "@/mocks";
import type { ScheduleRow } from "@/domain/types";
import { GhostUnitModal } from "@/components/GhostUnitModal";
import { apiClient } from "@/lib/api/apiClient";

type OfferMode = "normal" | "event" | "allplans" | "comparison" | "recovery";

export default function NewOffer() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(() =>
    settingsService.get(),
  );

  useEffect(() => {
    let mounted = true;
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get<{
          success: boolean;
          data: {
            teamName?: string;
            usdRate?: number;
            eurRate?: number;
            gbpRate?: number;
            inrRate?: number;
            rubRate?: number;
            audRate?: number;
            cadRate?: number;
            sarRate?: number;
            pkrRate?: number;
            fxRates?: {
              rates: Record<string, number>;
            };
          };
        }>("settings");
        if (mounted && response.data?.success && response.data.data) {
          const data = response.data.data;
          const rates = data.fxRates?.rates || {};
          const currentSettings = settingsService.get();
          const mergedSettings: Settings = {
            teamName: data.teamName || currentSettings.teamName,
            usdRate:
              rates.USD ?? data.usdRate ?? currentSettings.usdRate ?? 0.272,
            eurRate:
              rates.EUR ?? data.eurRate ?? currentSettings.eurRate ?? 0.25,
            gbpRate:
              rates.GBP ?? data.gbpRate ?? currentSettings.gbpRate ?? 0.214,
            inrRate:
              rates.INR ?? data.inrRate ?? currentSettings.inrRate ?? 22.5,
            rubRate:
              rates.RUB ?? data.rubRate ?? currentSettings.rubRate ?? 24.8,
            audRate:
              rates.AUD ?? data.audRate ?? currentSettings.audRate ?? 0.421,
            cadRate:
              rates.CAD ?? data.cadRate ?? currentSettings.cadRate ?? 0.371,
            sarRate:
              rates.SAR ?? data.sarRate ?? currentSettings.sarRate ?? 1.02,
            pkrRate:
              rates.PKR ?? data.pkrRate ?? currentSettings.pkrRate ?? 75.6,
          };
          setSettings(mergedSettings);
          settingsService.update(mergedSettings);
        }
      } catch (err) {
        console.error("Failed to fetch settings from API:", err);
      }
    };
    fetchSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [step, setStep] = useState<number>(() => {
    const val = localStorage.getItem("reportage_offer_step");
    return val ? parseInt(val, 10) : 1;
  });

  const [restoredProjId, setRestoredProjId] = useState<string | null>(() => {
    return localStorage.getItem("reportage_offer_proj_id");
  });
  const [restoredUnitId, setRestoredUnitId] = useState<string | null>(() => {
    return localStorage.getItem("reportage_offer_unit_id");
  });
  const [restoredPlanId, setRestoredPlanId] = useState<string | null>(() => {
    return localStorage.getItem("reportage_offer_plan_id");
  });

  const [proj, setProj] = useState<Project | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [plan, setPlan] = useState<PaymentPlan | null>(null);
  const [offerMode, setOfferMode] = useState<OfferMode>("normal");
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [split, setSplit] = useState(1);
  const [unitSearch, setUnitSearch] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [unitTypeFilter, setUnitTypeFilter] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [day7Input, setDay7Input] = useState(DEFAULT_DAY7_PAYMENT);
  const [client, setClient] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [extraCurrency, setExtraCurrency] = useState("");
  const [liveRate, setLiveRate] = useState("");

  useEffect(() => {
    if (extraCurrency === "USD") {
      setLiveRate(String(AED_TO_USD));
    } else if (extraCurrency) {
      const ratesMap: Record<string, number> = {
        EUR: settings.eurRate || 0.25,
        GBP: settings.gbpRate || 0.214,
        INR: settings.inrRate || 22.5,
        RUB: settings.rubRate || 24.8,
        AUD: settings.audRate || 0.421,
        CAD: settings.cadRate || 0.371,
        SAR: settings.sarRate || 1.02,
        PKR: settings.pkrRate || 75.6,
      };
      const targetRate = ratesMap[extraCurrency];
      setLiveRate(targetRate ? String(targetRate) : "");
    } else {
      setLiveRate("");
    }
  }, [extraCurrency, settings]);

  const [agentToggles, setAgentToggles] = useState({
    showAgentName: true,
    showAgentPhone: true,
    showAgentEmail: true,
  });
  const [recoveryBaseId, setRecoveryBaseId] = useState("");
  const [recoveryMonthlyPct, setRecoveryMonthlyPct] = useState("");
  const [recoveryFreq, setRecoveryFreq] = useState(6);
  const [recoverySchedule, setRecoverySchedule] = useState<{
    basePlan: PaymentPlan | null;
    netPrice: number;
    rows: ScheduleRow[];
    reducedPct: number;
    freq: number;
  } | null>(null);
  const [recoveryGenerating, setRecoveryGenerating] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [isEvent, setIsEvent] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    base64: string;
    offerData: any;
    template: "single-offer" | "comparison" | "all-plans";
    fileName: string;
  } | null>(null);
  const [ghostModalOpen, setGhostModalOpen] = useState(false);

  const [fetchedUnits, setFetchedUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitsPagination, setUnitsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [unitPaymentPlans, setUnitPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Synchronize wizard selections to localStorage
  useEffect(() => {
    localStorage.setItem("reportage_offer_step", String(step));
  }, [step]);

  useEffect(() => {
    if (proj) {
      localStorage.setItem("reportage_offer_proj_id", proj.id);
    } else {
      localStorage.removeItem("reportage_offer_proj_id");
      setRestoredProjId(null);
    }
  }, [proj]);

  useEffect(() => {
    if (unit) {
      localStorage.setItem("reportage_offer_unit_id", unit.id);
    } else {
      localStorage.removeItem("reportage_offer_unit_id");
      setRestoredUnitId(null);
    }
  }, [unit]);

  useEffect(() => {
    if (plan) {
      localStorage.setItem("reportage_offer_plan_id", plan.id);
    } else {
      localStorage.removeItem("reportage_offer_plan_id");
      setRestoredPlanId(null);
    }
  }, [plan]);

  // Validate step state to prevent blank pages
  useEffect(() => {
    if (!loadingProjects && step > 1 && !proj) {
      setStep(1);
    } else if (!loadingProjects && !loadingUnits && step > 2 && !unit) {
      setStep(2);
    } else if (
      !loadingProjects &&
      !loadingUnits &&
      !loadingPlans &&
      step > 3 &&
      !plan &&
      offerMode !== "recovery" &&
      offerMode !== "comparison" &&
      offerMode !== "allplans"
    ) {
      setStep(3);
    }
  }, [
    step,
    proj,
    unit,
    plan,
    loadingProjects,
    loadingUnits,
    loadingPlans,
    offerMode,
  ]);

  // GET projects
  useEffect(() => {
    let mounted = true;
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await apiClient.get<{
          success: boolean;
          data: { projects: Project[] };
        }>("availability/projects");

        if (
          mounted &&
          response.data?.success &&
          Array.isArray(response.data.data?.projects)
        ) {
          const list = response.data.data.projects;
          setProjects(list);

          // Restore project if cached project ID is present
          if (restoredProjId) {
            const matched = list.find((p) => p.id === restoredProjId);
            if (matched) {
              try {
                const fullRes = await apiClient.get<{
                  success: boolean;
                  data: { project: Project };
                }>(`projects/${restoredProjId}`);
                if (
                  mounted &&
                  fullRes.data?.success &&
                  fullRes.data.data?.project
                ) {
                  setProj(fullRes.data.data.project);
                }
              } catch (e) {
                console.error("Failed to restore project details:", e);
              }
            } else {
              setRestoredProjId(null);
              localStorage.removeItem("reportage_offer_proj_id");
            }
          }
        }
      } catch (err) {
        console.error(
          "Error fetching projects from GET /api/availability/projects:",
          err,
        );
      } finally {
        if (mounted) {
          setLoadingProjects(false);
        }
      }
    };

    fetchProjects();
    return () => {
      mounted = false;
    };
  }, [restoredProjId]);

  // Fetch unit list callback
  const fetchUnitsForProject = useCallback(
    async (
      projectId: string,
      searchVal?: string,
      typeVal?: string,
      projectObj?: Project | null,
      page: number = 1,
      limit: number = 20,
    ) => {
      const activeProj = projectObj || proj;
      if (!projectId) return;

      setLoadingUnits(true);
      try {
        const params: Record<string, string | number> = {};
        if (searchVal && searchVal.trim()) {
          params.search = searchVal.trim();
        }
        if (typeVal && typeVal.trim()) {
          const matchedLabel =
            activeProj?.unitTypes?.find(
              (ut) => ut.id === typeVal || ut.label === typeVal,
            )?.label || typeVal;
          params.unitType = matchedLabel.trim();
        }
        params.page = page;
        params.limit = limit;

        const res = await apiClient.get<{
          success: boolean;
          data: {
            projectId: string;
            projectName: string;
            unitCount: number;
            unitTypes?: string[];
            units: Array<Record<string, unknown>>;
            pagination: {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            };
          };
        }>(`availability/${projectId}/units`, { params });

        if (res.data?.success && Array.isArray(res.data.data?.units)) {
          const uList: Unit[] = res.data.data.units.map((raw) => ({
            id: raw.id as string,
            number: raw.number as string,
            projectId: raw.projectId as string,
            typeId: raw.typeId as string,
            floor: (raw.floor as number | string) ?? 0,
            areaInternal:
              (raw.internal as number) ?? (raw.areaInternal as number) ?? 0,
            areaExternal:
              (raw.external as number) ?? (raw.areaExternal as number) ?? 0,
            area: (raw.total as number) ?? (raw.area as number) ?? 0,
            price: (raw.price as number) ?? 0,
            subtype: (raw.subtype as string) || (raw.subType as string) || "",
            isGhost: (raw.isGhost as boolean) || false,
            createdBy: (raw.createdBy as string) || undefined,
          }));
          setFetchedUnits(uList);

          if (res.data.data.pagination) {
            setUnitsPagination(res.data.data.pagination);
          }

          // Restore unit if cached unit ID is present
          if (restoredUnitId) {
            const matched = uList.find((u) => u.id === restoredUnitId);
            if (matched) {
              setUnit(matched);
            } else {
              setRestoredUnitId(null);
              localStorage.removeItem("reportage_offer_unit_id");
            }
          }
        }
      } catch (err) {
        console.error("Error fetching units for project:", err);
      } finally {
        setLoadingUnits(false);
      }
    },
    [proj, restoredUnitId],
  );

  // Fetch payment plans callback
  const fetchPlansForUnit = useCallback(
    async (projectId: string, unitId: string) => {
      if (!projectId || !unitId) return;

      setLoadingPlans(true);
      try {
        const res = await apiClient.get<{
          success: boolean;
          data: {
            unitId: string;
            unitNumber: string;
            unitType: string;
            projectName: string;
            paymentPlans: PaymentPlan[];
          };
        }>(`availability/${projectId}/units/${unitId}/payment-plans`);

        if (res.data?.success && Array.isArray(res.data.data?.paymentPlans)) {
          const plansList = res.data.data.paymentPlans;
          setUnitPaymentPlans(plansList);

          // Restore plan if cached plan ID is present
          if (restoredPlanId) {
            const matched = plansList.find((p) => p.id === restoredPlanId);
            if (matched) {
              setPlan(matched);
            } else {
              setRestoredPlanId(null);
              localStorage.removeItem("reportage_offer_plan_id");
            }
          }
        }
      } catch (err) {
        console.error("Error fetching payment plans for unit:", err);
      } finally {
        setLoadingPlans(false);
      }
    },
    [restoredPlanId],
  );

  // Project select handler
  const handleSelectProject = async (p: Project) => {
    // toast.loading("Loading project details...", { id: "proj-details" });
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: { project: Project };
      }>(`projects/${p.id}`);

      if (res.data?.success && res.data.data?.project) {
        const rawProj = res.data.data.project as any;
        // Map backend unitTypes.subtypes into floorPlans format expected by resolveFloorPlan
        let backendRoot = (
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/"
        ).replace(/\/api\/?$/, "");
        if (backendRoot.endsWith("/")) backendRoot = backendRoot.slice(0, -1);
        const mappedUnitTypes = (rawProj.unitTypes || []).map((ut: any) => {
          const floorPlansMap: Record<string, FloorPlan> = {};
          (ut.subtypes || []).forEach((st: any) => {
            if (st.floorPlanPath) {
              const relativePath = String(st.floorPlanPath);
              const fullUrl = relativePath.startsWith("http")
                ? relativePath
                : `${backendRoot}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
              floorPlansMap[st.label] = {
                name: st.floorPlanName || `${st.label} Floor Plan`,
                dataUrl: fullUrl,
                isImage:
                  st.floorPlanIsImage !== null ? !!st.floorPlanIsImage : true,
              };
            }
          });
          return { ...ut, floorPlans: floorPlansMap };
        });
        const fullProj = { ...rawProj, unitTypes: mappedUnitTypes } as Project;
        // Map masterPlan from DB fields
        if (!fullProj.masterPlan && rawProj.masterPlanPath) {
          const mpRelativePath = String(rawProj.masterPlanPath);
          const mpUrl = mpRelativePath.startsWith("http")
            ? mpRelativePath
            : `${backendRoot}${mpRelativePath.startsWith("/") ? "" : "/"}${mpRelativePath}`;
          (fullProj as any).masterPlan = {
            name: rawProj.masterPlanName || "Master Plan",
            dataUrl: mpUrl,
            isImage:
              rawProj.masterPlanIsImage !== null
                ? !!rawProj.masterPlanIsImage
                : true,
          };
        }
        setProj(fullProj);
        setSplit(fullProj.dpSplitOptions?.[0] || 1);
        setStep(2);
        setUnit(null);
        setPlan(null);
        setFetchedUnits([]);
        setUnitsPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
        setUnitPaymentPlans([]);
        fetchUnitsForProject(fullProj.id, "", "", fullProj);
        // toast.success("Loaded project details!", { id: "proj-details" });
      } else {
        toast.error("Failed to load project details", { id: "proj-details" });
      }
    } catch (err) {
      console.error("Failed to load project details:", err);
      toast.error("Failed to load project details", { id: "proj-details" });
    }
  };

  // Unit select handler
  const handleSelectUnit = (u: Unit) => {
    setUnit(u);
    setPlan(null);
    setUnitPaymentPlans([]);
    setOfferMode("normal");
    setSelectedPlanIds([]);
    setStep(3);
    fetchPlansForUnit(proj!.id, u.id);
  };

  // Step navigation handler
  const handleGoToStep = (targetStep: number) => {
    if (targetStep < step) {
      if (targetStep === 1) {
        setProj(null);
        setUnit(null);
        setPlan(null);
        setFetchedUnits([]);
        setUnitsPagination({
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
        });
        setUnitPaymentPlans([]);
        setRecoverySchedule(null);
        setRecoveryMonthlyPct("");
        setRecoveryBaseId("");
      } else if (targetStep === 2) {
        setUnit(null);
        setPlan(null);
        setRecoverySchedule(null);
        setRecoveryMonthlyPct("");
        setRecoveryBaseId("");
      } else if (targetStep === 3) {
        setPlan(null);
        setRecoverySchedule(null);
        setRecoveryMonthlyPct("");
        setRecoveryBaseId("");
      }
      setStep(targetStep);
    }
  };

  // Unit search and type filter effects
  useEffect(() => {
    if (step === 2 && proj) {
      const timer = setTimeout(() => {
        fetchUnitsForProject(
          proj.id,
          unitSearch,
          unitTypeFilter,
          proj,
          1,
          unitsPagination.limit,
        );
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [unitSearch, unitTypeFilter, step, proj, fetchUnitsForProject]);

  // Initial restore effects for unit and plans fetching
  useEffect(() => {
    if (proj && step >= 2 && fetchedUnits.length === 0 && !loadingUnits) {
      fetchUnitsForProject(proj.id, unitSearch, unitTypeFilter, proj);
    }
  }, [
    proj,
    step,
    fetchUnitsForProject,
    unitSearch,
    unitTypeFilter,
    loadingUnits,
    fetchedUnits.length,
  ]);

  useEffect(() => {
    if (
      proj &&
      unit &&
      step >= 3 &&
      unitPaymentPlans.length === 0 &&
      !loadingPlans
    ) {
      fetchPlansForUnit(proj.id, unit.id);
    }
  }, [
    proj,
    unit,
    step,
    fetchPlansForUnit,
    loadingPlans,
    unitPaymentPlans.length,
  ]);

  // Validate and sanitize step based on selection state, avoiding race conditions during API restore
  useEffect(() => {
    const isRestoringProj = restoredProjId && !proj;
    const isRestoringUnit = restoredUnitId && !unit;

    if (loadingProjects || loadingUnits || isRestoringProj || isRestoringUnit) {
      return;
    }

    if (!proj && step > 1) {
      setStep(1);
    } else if (proj && !unit && step > 2) {
      setStep(2);
    }
  }, [
    proj,
    unit,
    step,
    restoredProjId,
    restoredUnitId,
    loadingProjects,
    loadingUnits,
  ]);

  const unitType =
    proj && unit ? proj.unitTypes?.find((t) => t.id === unit.typeId) : null;
  const pc = proj?.primaryColor || "#B8860B";

  const availPlans = (() => {
    if (unitPaymentPlans.length > 0) return unitPaymentPlans;
    if (unitType && (unitType.paymentPlans || []).length > 0)
      return unitType.paymentPlans;
    if (proj) {
      const allUTPlans = (proj.unitTypes || []).reduce(
        (a, ut) => a.concat(ut.paymentPlans || []),
        [] as PaymentPlan[],
      );
      if (allUTPlans.length > 0) return allUTPlans;
    }
    return [];
  })();

  const filteredPlans =
    offerMode === "event"
      ? availPlans.filter(
          (p) =>
            (p.planType === "event" || p.planType === "both") &&
            p.eventDiscount,
        )
      : availPlans.filter(
          (p) =>
            p.planType === "normal" || p.planType === "both" || !p.planType,
        );
  const resolvedPlans =
    offerMode === "event"
      ? filteredPlans
      : filteredPlans.length === 0
        ? availPlans
        : filteredPlans;

  const effPlan = plan
    ? isEvent && plan.eventDiscount
      ? {
          ...plan,
          discount: plan.eventDiscount,
          installmentPct: plan.eventInstallmentPct || plan.installmentPct,
        }
      : plan
    : null;
  const activeDiscount = effPlan
    ? (effPlan.discount || 0) + (extraDiscount || 0)
    : 0;
  const USD_RATE = AED_TO_USD;
  const ratesFromSettings: Record<string, number> = {
    USD: USD_RATE,
    EUR: settings.eurRate || 0.25,
    GBP: settings.gbpRate || 0.214,
    INR: settings.inrRate || 22.5,
    RUB: settings.rubRate || 24.8,
    AUD: settings.audRate || 0.421,
    CAD: settings.cadRate || 0.371,
    SAR: settings.sarRate || 1.02,
    PKR: settings.pkrRate || 75.6,
  };
  const effectiveExtraRate =
    extraCurrency === "USD"
      ? USD_RATE
      : liveRate && +liveRate > 0
        ? +liveRate
        : ratesFromSettings[extraCurrency];

  const handleGenerateRecovery = () => {
    if (!proj || !unit || !recoveryBaseId || !recoveryMonthlyPct) return;
    const basePlan = availPlans.find((p) => p.id === recoveryBaseId);
    if (!basePlan) return;
    setRecoveryGenerating(true);
    setRecoveryError("");
    try {
      const result = buildRecoverySchedule({
        project: {
          completionDate: proj.completionDate,
          bookingToken: proj.bookingToken || DEFAULT_BOOKING_TOKEN,
        },
        unit: { price: unit.price },
        basePlan,
        monthlyPct: +recoveryMonthlyPct,
        freq: recoveryFreq,
        priceOverride: priceOverride ? +priceOverride : undefined,
        extraDiscount,
        split,
        day7Input,
      });
      if (result) {
        setRecoverySchedule({ ...result, basePlan });
      }
    } catch (e) {
      setRecoveryError("Could not generate schedule: " + (e as Error).message);
    }
    setRecoveryGenerating(false);
  };

  const saveOfferToApi = async (payload: any) => {
    try {
      await apiClient.post("offers", {
        projectId: proj?.id || "",
        projectName: proj?.name || "",
        unitId: unit?.id || "",
        unitNumber: unit?.number || "",
        unitType: unitType?.label || "",
        subType: unit?.subtype || "",
        planId: payload.planId || "",
        planLabel: payload.planLabel || "",
        offerMode,
        isEvent,
        clientName: client,
        clientPhone,
        listPrice: unit?.price || 0,
        discount: payload.discount || 0,
        netPrice: payload.netPrice || 0,
        extraDiscount,
        day7Payment: day7Input,
        currency: extraCurrency || "AED",
        exchangeRate: extraCurrency === "USD" ? 3.65 : Number(liveRate) || 0,
        schedule: payload.schedule || [],
        fees: {},
        type: payload.type || "single",
        action: payload.action || "generated",
        agentToggles,
      });
    } catch (err) {
      console.error("Failed to save offer to API:", err);
    }
  };

  const resolveFloorPlan = (
    projectObj: Project,
    unitObj: Unit,
    utObj: UnitType | null,
  ) => {
    const utFps = utObj?.floorPlans || {};
    const unitSub = unitObj.subtype || "";
    const normSub = (s: string) =>
      (s || "").toLowerCase().replace(/[\s_-]/g, "");

    console.log("[FP-RESOLVE] START", {
      projectId: projectObj.id,
      projectName: projectObj.name,
      unitTypeId: utObj?.id,
      unitTypeLabel: utObj?.label,
      subtype: unitSub,
      unitTypeFpKeys: Object.keys(utFps),
      projectFpKeys: Object.keys(projectObj.floorPlans || {}),
    });

    // Step 1: Try to match from unitType.floorPlans by subtype label
    const k =
      Object.keys(utFps).find(
        (kk) =>
          normSub(kk) === normSub(unitSub) ||
          normSub(unitSub).includes(normSub(kk)),
      ) || Object.keys(utFps).find((kk) => utFps[kk]);
    const fpData = k ? utFps[k] : null;

    if (fpData && typeof fpData === "object" && fpData.dataUrl) {
      console.log("[FP-RESOLVE] MATCH from unitType.floorPlans", {
        matchedKey: k,
        name: fpData.name,
        dataUrl: fpData.dataUrl?.substring(0, 80),
      });
      return fpData;
    }

    // Step 2: Try to match from project.floorPlans by subtype label
    // proj.floorPlans keys are subtype labels (e.g. "Type A", "Type B")
    // NOT unit type IDs
    const projFps = projectObj.floorPlans || {};
    if (unitSub && projFps[unitSub]) {
      const projFp = projFps[unitSub];
      if (typeof projFp === "object" && projFp.dataUrl) {
        console.log("[FP-RESOLVE] MATCH from project.floorPlans by subtype", {
          matchedKey: unitSub,
          name: projFp.name,
          dataUrl: projFp.dataUrl?.substring(0, 80),
        });
        return projFp;
      }
    }

    // Step 3: Try fuzzy match from project.floorPlans
    const projMatchKey = Object.keys(projFps).find(
      (kk) =>
        normSub(kk) === normSub(unitSub) ||
        normSub(unitSub).includes(normSub(kk)),
    );
    if (
      projMatchKey &&
      typeof projFps[projMatchKey] === "object" &&
      projFps[projMatchKey].dataUrl
    ) {
      console.log("[FP-RESOLVE] FUZZY match from project.floorPlans", {
        matchedKey: projMatchKey,
        name: projFps[projMatchKey].name,
        dataUrl: projFps[projMatchKey].dataUrl?.substring(0, 80),
      });
      return projFps[projMatchKey];
    }

    console.log("[FP-RESOLVE] No floor plan found", {
      unitSub,
      unitTypeFpKeys: Object.keys(utFps),
      projectFpKeys: Object.keys(projFps),
    });
    return null;
  };

  const generateServerPreview = async (
    template: "single-offer" | "comparison" | "all-plans",
    offerData: any,
    defaultFileName: string,
  ) => {
    console.log("[PDF-GEN] Sending to backend", {
      template,
      projectId: offerData.project?.id,
      projectName: offerData.project?.name,
      unitTypeId: offerData.unitType?.id,
      unitTypeLabel: offerData.unitType?.label,
      subtype: offerData.unit?.subtype,
      fp: offerData.fp
        ? {
            name: offerData.fp.name,
            dataUrl: offerData.fp.dataUrl?.substring(0, 100),
            isImage: offerData.fp.isImage,
          }
        : null,
    });
    toast.loading("Generating preview...", { id: "pdf-gen" });
    try {
      const response = await apiClient.post("pdf/preview", {
        template,
        format: "A4",
        offerData,
      });

      if (response.data?.success && response.data.data) {
        setPdfPreview({
          base64: response.data.data,
          offerData,
          template,
          fileName: defaultFileName,
        });
        toast.success("Preview generated successfully!", { id: "pdf-gen" });
      } else {
        toast.error("Failed to generate preview", { id: "pdf-gen" });
      }
    } catch (err) {
      console.error("Failed to generate preview:", err);
      toast.error("Failed to generate preview", { id: "pdf-gen" });
    }
  };

  const generateOffer = async () => {
    if (!proj || !unit || !effPlan || !client.trim()) return;
    const effUnitPrice =
      priceOverride && +priceOverride > 0 ? +priceOverride : unit.price;
    const netPrice = effUnitPrice * (1 - activeDiscount / 100);
    const discountAmt = (effUnitPrice * activeDiscount) / 100;
    const feePct = proj.feePct || 4;
    const feeFixed = proj.feeFixed || 2194;
    const regFee = Math.round((netPrice * feePct) / 100) + feeFixed;
    const utilAmt =
      proj.utilityAmount ||
      UTILITY[proj.type === "Townhouses" ? "Townhouses" : "Apartments"];
    const resolvedUT =
      proj.unitTypes?.find((t) => t.id === unit.typeId) || unitType || null;
    const parkingAmt = calcParking(proj, resolvedUT as UnitType);
    const schedule = buildSchedule(
      effPlan,
      netPrice,
      proj.completionDate,
      split,
      proj.bookingToken || DEFAULT_BOOKING_TOKEN,
      day7Input,
    );

    const floorPlan = resolveFloorPlan(proj, unit, resolvedUT);
    const fpForOffer = await ensurePdfDataUrl(floorPlan);
    const mpForOffer = await ensurePdfDataUrl(proj.masterPlan || null);

    const watermark = await watermarkToDataUrl(
      (user as Record<string, string | null> | null)?.watermark || null,
    );

    const offerData = {
      clientName: client,
      agentName: agentToggles.showAgentName ? user?.name : "",
      agentPhone: agentToggles.showAgentPhone
        ? (user as Record<string, string> | null)?.phone || ""
        : "",
      agentEmail: agentToggles.showAgentEmail
        ? (user as Record<string, string> | null)?.profileEmail ||
          user?.email ||
          ""
        : "",
      watermark,
      offerDate: new Date().toISOString().split("T")[0],
      netPrice,
      discountAmt,
      parking: parkingAmt,
      regFee,
      utility: utilAmt,
      eventName: isEvent && effPlan.eventName ? effPlan.eventName : "",
      extraCurrency:
        extraCurrency &&
        (extraCurrency === "USD" || (liveRate && +liveRate > 0))
          ? extraCurrency
          : null,
      liveRates: { ...ratesFromSettings, [extraCurrency]: effectiveExtraRate },
      schedule: schedule.map((s) => ({
        label: s.label,
        date: s.date ? s.date.toISOString().split("T")[0] : null,
        amount: s.amount,
        type: s.type,
      })),
      project: {
        id: proj.id,
        name: proj.name,
        location: proj.location,
        type: proj.type,
        status: proj.status,
        completionDate: proj.completionDate,
        primaryColor: proj.primaryColor,
        secondaryColor: proj.secondaryColor,
        feeLabel: proj.feeLabel,
        disclaimer: proj.disclaimer,
        whyBuy: proj.whyBuy || [],
        heroImage: proj.heroImage,
      },
      unit: {
        number: unit.number,
        floor: String(unit.floor),
        areaInternal: unit.areaInternal,
        areaExternal: unit.areaExternal,
        area: unit.area,
        subtype: unit.subtype,
      },
      unitType: resolvedUT
        ? {
            id: resolvedUT.id,
            label: resolvedUT.label,
            virtualTour: resolvedUT.virtualTour,
          }
        : null,
      plan: {
        dp: effPlan.dp,
        installmentPct: effPlan.installmentPct,
        onHandover: effPlan.onHandover,
        durationType: effPlan.durationType,
        durationMonths: effPlan.durationMonths,
        discount: activeDiscount,
      },
      fp: fpForOffer,
      masterPlan: mpForOffer,
    };

    await generateServerPreview(
      "single-offer",
      offerData,
      `${client.replace(/\s+/g, "_")}_offer.pdf`,
    );
  };

  const generateAllPlans = async () => {
    if (!proj || !unit || selectedPlanIds.length === 0 || !client.trim())
      return;
    const plansToUse = availPlans.filter((p) => selectedPlanIds.includes(p.id));
    const today = new Date();
    const resolvedUT =
      proj.unitTypes?.find((t) => t.id === unit.typeId) || unitType || null;
    const feePct = proj.feePct || 4;
    const feeFixed = proj.feeFixed || 2194;
    const utilAmt =
      proj.utilityAmount ||
      UTILITY[proj.type === "Townhouses" ? "Townhouses" : "Apartments"];
    const parkingAmt = calcParking(proj, resolvedUT as UnitType);
    const floorPlan = resolveFloorPlan(proj, unit, resolvedUT);
    const fpForOffer = await ensurePdfDataUrl(floorPlan);
    const mpForOffer = await ensurePdfDataUrl(proj.masterPlan || null);
    const allOffers = plansToUse.map((p) => {
      const effDisc =
        (isEvent && p.eventDiscount ? p.eventDiscount : p.discount) +
        (extraDiscount || 0);
      const effUnitPrice2 =
        priceOverride && +priceOverride > 0 ? +priceOverride : unit.price;
      const netPrice = effUnitPrice2 * (1 - effDisc / 100);
      const discountAmt = (effUnitPrice2 * effDisc) / 100;
      const regFee = Math.round((netPrice * feePct) / 100) + feeFixed;
      const schedule = buildSchedule(
        p,
        netPrice,
        proj.completionDate,
        split,
        proj.bookingToken || DEFAULT_BOOKING_TOKEN,
        day7Input,
      );
      return {
        plan: {
          label: p.label,
          discount: effDisc,
          dp: p.dp,
          installmentPct: p.installmentPct,
          durationType: p.durationType,
          durationMonths: p.durationMonths,
        },
        netPrice,
        discountAmt,
        regFee,
        utility: utilAmt,
        parking: parkingAmt,
        schedule: schedule.map((s) => ({
          label: s.label,
          date: s.date ? s.date.toISOString().split("T")[0] : null,
          amount: s.amount,
          type: s.type,
        })),
        isEvent,
      };
    });

    const watermark = await watermarkToDataUrl(
      (user as Record<string, string | null | undefined> | null)?.watermark ||
        null,
    );

    const offerData = {
      clientName: client,
      agentName: agentToggles.showAgentName ? user?.name : "",
      agentPhone: agentToggles.showAgentPhone
        ? (user as Record<string, string> | null)?.phone || ""
        : "",
      agentEmail: agentToggles.showAgentEmail
        ? (user as Record<string, string> | null)?.profileEmail ||
          user?.email ||
          ""
        : "",
      project: {
        id: proj.id,
        name: proj.name,
        location: proj.location,
        type: proj.type,
        status: proj.status,
        completionDate: proj.completionDate,
        primaryColor: proj.primaryColor,
        secondaryColor: proj.secondaryColor,
        feeLabel: proj.feeLabel,
        disclaimer: proj.disclaimer,
        whyBuy: proj.whyBuy || [],
        heroImage: proj.heroImage,
      },
      offers: allOffers,
      watermark,
      fp: fpForOffer,
      masterPlan: mpForOffer,
      unit: {
        subtype: unit.subtype,
      },
      unitType: resolvedUT
        ? {
            id: resolvedUT.id,
            label: resolvedUT.label,
            virtualTour: resolvedUT.virtualTour,
          }
        : null,
      offerDate: today.toISOString().split("T")[0],
    };

    await generateServerPreview(
      "all-plans",
      offerData,
      `${client.replace(/\s+/g, "_")}_all_plans.pdf`,
    );
  };

  const generateComparison = async () => {
    if (!proj || !unit || selectedPlanIds.length === 0 || !client.trim())
      return;
    const plansForComp = availPlans.filter((p) =>
      selectedPlanIds.includes(p.id),
    );
    const today = new Date();
    const resolvedUT =
      proj.unitTypes?.find((t) => t.id === unit.typeId) || unitType || null;
    const parkingAmtCmp = calcParking(proj, resolvedUT as UnitType);
    const floorPlan = resolveFloorPlan(proj, unit, resolvedUT);
    const fpForOffer = await ensurePdfDataUrl(floorPlan);
    const mpForOffer = await ensurePdfDataUrl(proj.masterPlan || null);

    const watermark = await watermarkToDataUrl(
      (user as Record<string, string | null> | null)?.watermark || null,
    );

    const offerData = {
      clientName: client,
      agentName: agentToggles.showAgentName ? user?.name : "",
      project: {
        id: proj.id,
        name: proj.name,
        location: proj.location,
        type: proj.type,
        status: proj.status,
        completionDate: proj.completionDate,
        primaryColor: proj.primaryColor,
        secondaryColor: proj.secondaryColor,
        feeLabel: proj.feeLabel,
        feePct: proj.feePct,
        feeFixed: proj.feeFixed,
        utilityAmount: proj.utilityAmount,
        disclaimer: proj.disclaimer,
        heroImage: proj.heroImage,
        whyBuy: proj.whyBuy || [],
      },
      offer: {
        isEvent,
      },
      plans: plansForComp.map((p) => ({
        label: p.label,
        dp: p.dp,
        installmentPct: p.installmentPct,
        durationType: p.durationType,
        durationMonths: p.durationMonths,
        discount: (p.discount || 0) + (extraDiscount || 0),
        eventDiscount: p.eventDiscount
          ? p.eventDiscount + (extraDiscount || 0)
          : undefined,
      })),
      unit: {
        price: unit.price,
        number: unit.number,
        floor: unit.floor,
        areaInternal: unit.areaInternal,
        areaExternal: unit.areaExternal,
        area: unit.area,
        subtype: unit.subtype,
      },
      unitType: resolvedUT
        ? {
            id: resolvedUT.id,
            label: resolvedUT.label,
            subtype: unit.subtype,
            virtualTour: resolvedUT.virtualTour,
          }
        : null,
      fp: fpForOffer,
      masterPlan: mpForOffer,
      parking: parkingAmtCmp,
      extraCurrency:
        extraCurrency &&
        (extraCurrency === "USD" || (liveRate && +liveRate > 0))
          ? extraCurrency
          : null,
      liveRates: {
        ...ratesFromSettings,
        [extraCurrency]: effectiveExtraRate,
      },
      watermark,
      offerDate: today.toISOString().split("T")[0],
    };

    await generateServerPreview(
      "comparison",
      offerData,
      `${client.replace(/\s+/g, "_")}_comparison.pdf`,
    );
  };

  const generateRecoveryOffer = async () => {
    if (!proj || !unit || !client.trim()) return;
    const bp = recoveryBaseId
      ? (availPlans.find((p) => p.id === recoveryBaseId) as PaymentPlan)
      : (recoverySchedule?.basePlan as PaymentPlan);
    if (!bp) return;
    const today = new Date();

    const freshResult = buildRecoverySchedule({
      project: {
        completionDate: proj.completionDate,
        bookingToken: proj.bookingToken || DEFAULT_BOOKING_TOKEN,
      },
      unit: { price: unit.price },
      basePlan: bp,
      monthlyPct: recoveryMonthlyPct
        ? +recoveryMonthlyPct
        : recoverySchedule?.reducedPct || 0,
      freq: recoveryFreq || recoverySchedule?.freq || 6,
      priceOverride: priceOverride ? +priceOverride : undefined,
      extraDiscount,
      split,
      day7Input,
    });

    const rows = freshResult ? freshResult.rows : recoverySchedule?.rows || [];
    const netPrice = freshResult
      ? freshResult.netPrice
      : recoverySchedule?.netPrice || 0;

    const effPriceRec2 =
      priceOverride && +priceOverride > 0 ? +priceOverride : unit.price;
    const totalDiscRec2 = (bp.discount || 0) + (extraDiscount || 0);
    const discountAmt = (effPriceRec2 * totalDiscRec2) / 100;
    const feePct = proj.feePct || 4;
    const feeFixed = proj.feeFixed || 2194;
    const regFee = Math.round((netPrice * feePct) / 100) + feeFixed;
    const utilAmt =
      proj.utilityAmount ||
      UTILITY[proj.type === "Townhouses" ? "Townhouses" : "Apartments"];
    const resolvedUT =
      proj.unitTypes?.find((t) => t.id === unit.typeId) || unitType || null;
    const parkingAmt = calcParking(proj, resolvedUT as UnitType);

    const floorPlan = resolveFloorPlan(proj, unit, resolvedUT);
    const fpForOffer = await ensurePdfDataUrl(floorPlan);
    const mpForOffer = await ensurePdfDataUrl(proj.masterPlan || null);

    const watermark = await watermarkToDataUrl(
      (user as Record<string, string | null> | null)?.watermark || null,
    );

    const offerData = {
      clientName: client,
      agentName: agentToggles.showAgentName ? user?.name : "",
      agentPhone: agentToggles.showAgentPhone
        ? (user as Record<string, string> | null)?.phone || ""
        : "",
      agentEmail: agentToggles.showAgentEmail
        ? (user as Record<string, string> | null)?.profileEmail ||
          user?.email ||
          ""
        : "",
      watermark,
      offerDate: today.toISOString().split("T")[0],
      netPrice,
      discountAmt,
      parking: parkingAmt,
      regFee,
      utility: utilAmt,
      eventName: "",
      extraCurrency:
        extraCurrency &&
        (extraCurrency === "USD" || (liveRate && +liveRate > 0))
          ? extraCurrency
          : null,
      liveRates: {
        ...ratesFromSettings,
        [extraCurrency]: +liveRate || ratesFromSettings[extraCurrency],
      },
      schedule: rows.map((s) => ({
        label: s.label,
        date: s.date ? s.date.toISOString().split("T")[0] : null,
        amount: s.amount,
        type: s.type,
      })),
      project: {
        id: proj.id,
        name: proj.name,
        location: proj.location,
        type: proj.type,
        status: proj.status,
        completionDate: proj.completionDate,
        primaryColor: proj.primaryColor,
        secondaryColor: proj.secondaryColor,
        feeLabel: proj.feeLabel,
        disclaimer: proj.disclaimer,
        whyBuy: proj.whyBuy || [],
        heroImage: proj.heroImage,
      },
      unit: {
        number: unit.number,
        floor: String(unit.floor),
        areaInternal: unit.areaInternal,
        areaExternal: unit.areaExternal,
        area: unit.area,
        subtype: unit.subtype,
      },
      unitType: resolvedUT
        ? {
            id: resolvedUT.id,
            label: resolvedUT.label,
            virtualTour: resolvedUT.virtualTour,
          }
        : null,
      plan: {
        dp: bp.dp,
        installmentPct: bp.installmentPct,
        onHandover: bp.onHandover,
        durationType: bp.durationType,
        durationMonths: bp.durationMonths,
        discount: (bp.discount || 0) + (extraDiscount || 0),
        label: `${bp.label} (Recovery ${freshResult ? freshResult.reducedPct : recoverySchedule?.reducedPct || 0}%/mo + ${freshResult ? freshResult.freq : recoverySchedule?.freq || 6}mo recovery)`,
      },
      fp: fpForOffer,
      masterPlan: mpForOffer,
    };

    await generateServerPreview(
      "single-offer",
      offerData,
      `${client.replace(/\s+/g, "_")}_recovery_offer.pdf`,
    );
  };

  const handleGenerate = () => {
    if (offerMode === "comparison") generateComparison();
    else if (offerMode === "allplans") generateAllPlans();
    else if (offerMode === "recovery" && recoverySchedule)
      generateRecoveryOffer();
    else generateOffer();
  };

  const handleDone = () => {
    if (offerMode === "comparison") {
      if (!proj || !unit || selectedPlanIds.length === 0 || !client.trim())
        return;
      const plansForComp = availPlans.filter((p) =>
        selectedPlanIds.includes(p.id),
      );
      saveOfferToApi({
        planId: "",
        planLabel: `${plansForComp.length} plans compared`,
        discount: 0,
        netPrice: unit.price,
        schedule: [],
        type: "comparison",
        action: "generated",
      });
      toast.success(`Offer saved`);
    } else if (offerMode === "allplans") {
      if (!proj || !unit || selectedPlanIds.length === 0 || !client.trim())
        return;
      const plansToUse = availPlans.filter((p) =>
        selectedPlanIds.includes(p.id),
      );
      saveOfferToApi({
        planId: "",
        planLabel: `${plansToUse.length} plans PDF`,
        discount: 0,
        netPrice: unit.price,
        schedule: [],
        type: "allplans",
        action: "generated",
      });
      toast.success(`Offer saved`);
    } else if (offerMode === "recovery") {
      if (!proj || !unit || !client.trim()) return;
      const bp = recoveryBaseId
        ? (availPlans.find((p) => p.id === recoveryBaseId) as PaymentPlan)
        : (recoverySchedule?.basePlan as PaymentPlan);
      if (!bp) return;
      const freshResult = buildRecoverySchedule({
        project: {
          completionDate: proj.completionDate,
          bookingToken: proj.bookingToken || DEFAULT_BOOKING_TOKEN,
        },
        unit: { price: unit.price },
        basePlan: bp,
        monthlyPct: recoveryMonthlyPct
          ? +recoveryMonthlyPct
          : recoverySchedule?.reducedPct || 0,
        freq: recoveryFreq || recoverySchedule?.freq || 6,
        priceOverride: priceOverride ? +priceOverride : undefined,
        extraDiscount,
        split,
        day7Input,
      });
      const rows = freshResult
        ? freshResult.rows
        : recoverySchedule?.rows || [];
      const netPrice = freshResult
        ? freshResult.netPrice
        : recoverySchedule?.netPrice || 0;
      saveOfferToApi({
        planId: bp.id,
        planLabel: `Recovery: ${bp.label} (${freshResult ? freshResult.reducedPct : recoverySchedule?.reducedPct || 0}%/mo)`,
        discount: (bp.discount || 0) + (extraDiscount || 0),
        netPrice,
        schedule: rows,
        type: "recovery",
        action: "generated",
      });
      toast.success(`Offer saved`);
    } else {
      if (!proj || !unit || !effPlan || !client.trim()) return;
      const effUnitPrice =
        priceOverride && +priceOverride > 0 ? +priceOverride : unit.price;
      const netPrice = effUnitPrice * (1 - activeDiscount / 100);
      const schedule = buildSchedule(
        effPlan,
        netPrice,
        proj.completionDate,
        split,
        proj.bookingToken || DEFAULT_BOOKING_TOKEN,
        day7Input,
      );
      saveOfferToApi({
        planId: effPlan.id,
        planLabel: effPlan.label,
        discount: activeDiscount,
        netPrice,
        schedule,
        type: "single",
        action: "generated",
      });
      toast.success(`Offer saved`);
    }

    // Reset wizard state to go back to New Offer (Step 1)
    setProj(null);
    setUnit(null);
    setPlan(null);
    setOfferMode("normal");
    setSelectedPlanIds([]);
    setSplit(1);
    setUnitSearch("");
    setUnitTypeFilter("");
    setPriceOverride("");
    setExtraDiscount(0);
    setDay7Input(DEFAULT_DAY7_PAYMENT);
    setClient("");
    setClientPhone("");
    setExtraCurrency("");
    setLiveRate("");
    setRecoveryBaseId("");
    setRecoveryMonthlyPct("");
    setRecoveryFreq(6);
    setRecoverySchedule(null);
    setFetchedUnits([]);
    setUnitsPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
    setUnitPaymentPlans([]);
    setStep(1);

    // Clear local storage values
    localStorage.removeItem("reportage_offer_proj_id");
    localStorage.removeItem("reportage_offer_unit_id");
    localStorage.removeItem("reportage_offer_plan_id");
    localStorage.removeItem("reportage_offer_step");
  };

  if (pdfPreview) {
    return (
      <ServerPdfPreview
        base64={pdfPreview.base64}
        offerData={pdfPreview.offerData}
        template={pdfPreview.template}
        fileName={pdfPreview.fileName}
        onClose={() => setPdfPreview(null)}
      />
    );
  }

  if (projects.length === 0 && !loadingProjects) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-[26px] text-navy font-semibold">
            New Sales Offer
          </h1>
        </div>
        <div className="text-center py-16 bg-white rounded-[10px] border border-border shadow-[0_2px_8px_rgba(30,60,120,0.06)] p-6">
          <div className="text-navy font-serif text-[20px] font-semibold mb-2">
            There is no new offer available
          </div>
          <div className="text-navy-dim text-[13px]">
            Please check back later or contact your admin to upload
            availabilities.
          </div>
        </div>
      </div>
    );
  }

  const ghostUnits: Unit[] = (() => {
    if (!proj) return [];
    try {
      const g = storage.get<Record<string, any[]>>(STORAGE_KEYS.GHOST_UNITS);
      const list = g?.[proj.id] || [];
      const existingUnitTypes = proj.unitTypes || [];
      return list.map((u) => {
        const typeId =
          u.typeId ||
          existingUnitTypes.find(
            (ut) => ut.label.toLowerCase() === u.type?.toLowerCase(),
          )?.id ||
          existingUnitTypes[0]?.id ||
          "";
        return {
          id: u.id,
          number: u.number,
          projectId: proj.id,
          typeId,
          type: u.type,
          subtype: u.subtype,
          floor: u.floor,
          areaInternal: u.areaInternal || u.area,
          areaExternal: u.areaExternal,
          area: u.area,
          price: u.price,
          isGhost: true,
        };
      });
    } catch {
      return [];
    }
  })();

  const currentProjUnits = (() => {
    const baseUnits = fetchedUnits;
    const filteredGhosts = ghostUnits.filter(
      (gu) => !baseUnits.some((bu) => bu.number === gu.number),
    );
    return [...baseUnits, ...filteredGhosts];
  })();

  const steps = ["PROJECT", "UNIT", "PAYMENT PLAN", "GENERATE"];

  const inp =
    "w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue font-sans";
  const selS =
    "w-full h-[38px] px-3 rounded-[6px] border border-border text-[13px] text-navy bg-white outline-none focus:border-blue";
  const lbl =
    "block text-[10px] font-mono text-navy-light tracking-[1.6px] uppercase mb-1.5";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-[26px] text-navy font-semibold">
          New Sales Offer
        </h1>
      </div>

      <div
        className="p-[12px_20px] rounded-[10px] border border-border mb-5 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
        style={{ background: "#fff" }}
      >
        <div className="flex gap-0">
          {steps.map((s, i) => {
            const stepNum = i + 1;
            const isClickable = stepNum < step;
            return (
              <div
                key={i}
                onClick={isClickable ? () => handleGoToStep(stepNum) : undefined}
                className={`flex-1 text-center p-[8px_4px] text-[11px] font-mono tracking-[1px] whitespace-nowrap ${
                  isClickable ? "hover:opacity-80 transition-opacity" : ""
                }`}
                style={{
                  borderBottom:
                    step === stepNum
                      ? "2px solid #B8860B"
                      : "2px solid transparent",
                  color:
                    step === stepNum
                      ? "#B8860B"
                      : step > stepNum
                        ? "#1A8A5A"
                        : "#8892AA",
                  fontWeight: step === stepNum ? 700 : 400,
                  cursor: isClickable ? "pointer" : "default",
                }}
              >
                {step > stepNum ? "✓ " : ""}
                {stepNum}.{" "}
                <span className={step === stepNum ? "inline" : "hidden sm:inline"}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading states for restored session */}
      {step > 1 && !proj && loadingProjects && (
        <div className="text-center py-12 text-navy-dim text-[13px] font-mono animate-pulse">
          Loading your session...
        </div>
      )}
      {step > 2 && proj && !unit && loadingUnits && (
        <div className="text-center py-12 text-navy-dim text-[13px] font-mono animate-pulse">
          Loading unit details...
        </div>
      )}
      {step > 3 &&
        proj &&
        unit &&
        !plan &&
        loadingPlans &&
        offerMode !== "recovery" &&
        offerMode !== "comparison" &&
        offerMode !== "allplans" && (
          <div className="text-center py-12 text-navy-dim text-[13px] font-mono animate-pulse">
            Loading payment plans...
          </div>
        )}

      {/* Step 1: Select Project */}
      {step === 1 && (
        <div>
          <div className="text-[12px] text-navy-light mb-4">
            Click a project to select it
          </div>
          {loadingProjects ? (
            <div className="text-center py-12 text-navy-dim text-[13px] font-mono animate-pulse">
              Loading projects...
            </div>
          ) : (
            <div
              className="grid gap-[14px]"
              style={{
                gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
              }}
            >
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProject(p)}
                  className="p-[24px_28px] rounded-[10px] border border-border shadow-[0_2px_8px_rgba(30,60,120,0.06)] cursor-pointer transition-all duration-150"
                  style={{
                    background: "#fff",
                    borderTop: `3px solid ${p.primaryColor || "#B8860B"}`,
                  }}
                >
                  <div className="font-serif text-[18px] font-semibold text-navy mb-1">
                    {p.name}
                  </div>
                  <div className="text-[12px] text-navy-light">
                    {p.location} • {p.type ? ` ${p.type}` : ""}
                  </div>
                  <div className="text-[11px] text-navy-dim mt-1">
                    {p.completionDate} •
                    {p.completionDate && (
                      <span>
                        {(() => {
                          const m = getHandoverMonths(p.completionDate);
                          return m <= 0 ? " Ready" : ` ${m}mo`;
                        })()}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-2 h-[4px] rounded"
                    style={{
                      background: `linear-gradient(90deg,${p.primaryColor || "#B8860B"},${p.secondaryColor || "#aaa"})`,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Unit */}
      {step === 2 && proj && (
        <div>
          <button
            onClick={() => {
              setStep(1);
              setProj(null);
              setUnit(null);
              setPlan(null);
              setFetchedUnits([]);
              setUnitsPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
              });
              setUnitPaymentPlans([]);
            }}
            className="h-[38px] px-4 rounded-[6px] text-[12px] cursor-pointer mb-4 text-white border-none"
            style={{ background: "#1A2340" }}
          >
            Back to Projects
          </button>

          <div
            className="p-[14px_20px] rounded-[10px] border border-border mb-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
            style={{ background: "#fff" }}
          >
            <div className="flex gap-4 flex-wrap items-center mb-2.5">
              <div className="font-serif text-[18px] text-navy">
                {proj.name}
              </div>
              <span className="inline-flex items-center rounded px-2.5 py-0.5 text-[11px] font-mono border bg-gold-dim text-gold border-[rgba(184,134,11,0.3)]">
                {loadingUnits
                  ? "Loading..."
                  : `${unitsPagination.total} units available`}
              </span>
            </div>
            <div className="flex gap-2.5 flex-wrap">
              <input
                className={`${inp} flex-[2] min-w-[160px]`}
                placeholder="Search unit number..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
              />
              <select
                className={`${selS} flex-[1] min-w-[130px]`}
                value={unitTypeFilter}
                onChange={(e) => setUnitTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {(proj.unitTypes || []).map((ut) => (
                  <option key={ut.id} value={ut.id}>
                    {ut.label}
                  </option>
                ))}
              </select>
              {(unitSearch || unitTypeFilter) && (
                <button
                  onClick={() => {
                    setUnitSearch("");
                    setUnitTypeFilter("");
                  }}
                  className="h-[38px] px-3 rounded-[6px] text-xs cursor-pointer border border-border text-navy bg-white hover:bg-surface"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div
            className="overflow-hidden rounded-[10px] border border-border shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
            style={{ background: "#fff" }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface">
                  {(
                    [
                      "Unit",
                      "Type",
                      "Sub-type",
                      proj.type === "Townhouses" ? null : "Floor",
                      "Internal",
                      "External",
                      "Total",
                      "Price",
                    ].filter(Boolean) as string[]
                  ).map((h) => {
                    const colMap: Record<string, string> = {
                      Price: "price",
                      Internal: "areaInternal",
                      Total: "area",
                      Floor: "floor",
                      Unit: "number",
                      Type: "typeId",
                    };
                    const col = colMap[h] || "";
                    const isSort = col && sortCol === col;
                    return (
                      <th
                        key={h}
                        onClick={() => {
                          if (!col) return;
                          setSortDir(
                            sortCol === col && sortDir === "asc"
                              ? "desc"
                              : "asc",
                          );
                          setSortCol(col);
                        }}
                        className="px-3 py-[9px] text-left text-[10px] tracking-[1.4px] uppercase font-mono border-b-2 border-border"
                        style={{
                          color: isSort ? "#B8860B" : "#4A5880",
                          cursor: col ? "pointer" : "default",
                          userSelect: "none",
                        }}
                      >
                        {h}
                        {isSort ? (sortDir === "asc" ? " ^" : " v") : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {currentProjUnits.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-[13px] text-navy-dim"
                    >
                      No units loaded. Please upload availability in Admin
                      panel.
                    </td>
                  </tr>
                )}
                {(() => {
                  const fu = currentProjUnits.filter(
                    (u) =>
                      (!unitSearch ||
                        u.number
                          .toLowerCase()
                          .includes(unitSearch.toLowerCase())) &&
                      (!unitTypeFilter || u.typeId === unitTypeFilter),
                  );
                  if (fu.length === 0 && (unitSearch || unitTypeFilter))
                    return [{ _empty: true as const } as never];
                  return fu.slice().sort((a, b) => {
                    if (!sortCol) return 0;
                    const av =
                      sortCol === "number"
                        ? a.number || ""
                        : String(a[sortCol as keyof Unit] ?? 0);
                    const bv =
                      sortCol === "number"
                        ? b.number || ""
                        : String(b[sortCol as keyof Unit] ?? 0);
                    return sortDir === "asc"
                      ? av > bv
                        ? 1
                        : -1
                      : av < bv
                        ? 1
                        : -1;
                  });
                })().map((u: Unit & { _empty?: boolean }) => {
                  if (u._empty)
                    return (
                      <tr key="empty">
                        <td
                          colSpan={8}
                          className="px-3 py-6 text-center text-[13px] text-navy-dim"
                        >
                          No units match your search
                        </td>
                      </tr>
                    );
                  const ut = proj.unitTypes?.find((t) => t.id === u.typeId);
                  const isSelected = unit?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => {
                        handleSelectUnit(u);
                      }}
                      className="border-b border-border cursor-pointer"
                      style={{
                        background: isSelected
                          ? `rgba(${parseInt(pc.slice(1, 3), 16)},${parseInt(pc.slice(3, 5), 16)},${parseInt(pc.slice(5, 7), 16)},0.08)`
                          : "transparent",
                      }}
                    >
                      <td
                        className="px-3 py-[11px] text-[13px] font-mono font-semibold"
                        style={{ color: pc }}
                      >
                        {u.number}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] text-navy">
                        {ut?.label || "-"}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] text-navy-light">
                        {u.subtype || "-"}
                      </td>
                      {proj.type !== "Townhouses" && (
                        <td className="px-3 py-[11px] text-[13px] text-navy">
                          {u.floor}
                        </td>
                      )}
                      <td className="px-3 py-[11px] text-[13px] text-navy">
                        {(u.areaInternal || u.area || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] text-navy">
                        {(u.areaExternal || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] text-navy">
                        {(u.area || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] font-semibold text-navy">
                        {fmtAED(u.price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {unitsPagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 gap-3">
              <div className="text-[12px] text-navy-dim font-mono">
                Showing {(unitsPagination.page - 1) * unitsPagination.limit + 1}
                –
                {Math.min(
                  unitsPagination.page * unitsPagination.limit,
                  unitsPagination.total,
                )}{" "}
                of {unitsPagination.total}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    fetchUnitsForProject(
                      proj.id,
                      unitSearch,
                      unitTypeFilter,
                      proj,
                      unitsPagination.page - 1,
                      unitsPagination.limit,
                    );
                  }}
                  disabled={unitsPagination.page <= 1}
                  className="h-[34px] px-3.5 rounded-[6px] text-[12px] font-mono cursor-pointer border border-border text-navy bg-white hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {(() => {
                  const current = unitsPagination.page;
                  const total = unitsPagination.totalPages;
                  const pages: (number | string)[] = [];

                  pages.push(1);

                  if (current !== 1 && current !== total) {
                    if (current > 2) {
                      pages.push("ellipsis1");
                    }
                    pages.push(current);
                    if (current < total - 1) {
                      pages.push("ellipsis2");
                    }
                  } else {
                    if (total > 2) {
                      pages.push("ellipsis-mid");
                    }
                  }

                  if (total > 1) {
                    pages.push(total);
                  }

                  return pages.map((p, i) => {
                    if (typeof p === "string") {
                      return (
                        <span
                          key={`ell-${i}`}
                          className="px-1 text-navy-dim font-mono text-[12px]"
                        >
                          ...
                        </span>
                      );
                    }
                    const isSelected = p === current;
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          fetchUnitsForProject(
                            proj.id,
                            unitSearch,
                            unitTypeFilter,
                            proj,
                            p as number,
                            unitsPagination.limit,
                          );
                        }}
                        className={`h-[34px] min-w-[34px] px-2 rounded-[6px] text-[12px] font-mono cursor-pointer border text-center transition-all ${
                          isSelected
                            ? "text-white font-bold border-none"
                            : "border-border text-navy bg-white hover:bg-surface"
                        }`}
                        style={{
                          background: isSelected ? pc : undefined,
                        }}
                      >
                        {p}
                      </button>
                    );
                  });
                })()}
                <button
                  onClick={() => {
                    fetchUnitsForProject(
                      proj.id,
                      unitSearch,
                      unitTypeFilter,
                      proj,
                      unitsPagination.page + 1,
                      unitsPagination.limit,
                    );
                  }}
                  disabled={unitsPagination.page >= unitsPagination.totalPages}
                  className="h-[34px] px-3.5 rounded-[6px] text-[12px] font-mono cursor-pointer border border-border text-navy bg-white hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          <GhostUnitModal
            open={ghostModalOpen}
            onClose={() => setGhostModalOpen(false)}
            project={proj}
            onSubmit={(newUnit) => {
              const localMap = storage.get<UnitsMap>(STORAGE_KEYS.UNITS) || {};
              localMap[proj.id] = [...(localMap[proj.id] || []), newUnit];
              storage.set(STORAGE_KEYS.UNITS, localMap);
              const g: Record<string, unknown[]> = {};
              Object.keys(localMap).forEach((pid) => {
                g[pid] = (localMap[pid] || []).filter((uu) => uu.isGhost);
              });
              storage.set(STORAGE_KEYS.GHOST_UNITS, g);
              toast.success(`Ghost unit ${newUnit.number} created`);
              setGhostModalOpen(false);
              window.location.reload();
            }}
          />
        </div>
      )}

      {/* Step 3: Payment Plan */}
      {step === 3 && proj && unit && (
        <div>
          <button
            onClick={() => {
              setStep(2);
              setUnit(null);
            }}
            className="h-[38px] px-4 rounded-[6px] text-[12px] cursor-pointer mb-4 text-white border-none"
            style={{ background: "#1A2340" }}
          >
            Back to Units
          </button>

          <div
            className="p-[14px_20px] rounded-[10px] border border-border mb-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
            style={{ background: "#fff" }}
          >
            <div className="flex gap-6 flex-wrap items-center">
              {[
                ["UNIT", unit.number],
                ["TYPE", unitType?.label || "-"],
                [
                  "INTERNAL",
                  `${(unit.areaInternal || unit.area || 0).toLocaleString()} sqft`,
                ],
                [
                  "EXTERNAL",
                  `${(unit.areaExternal || 0).toLocaleString()} sqft`,
                ],
                ["TOTAL", `${(unit.area || 0).toLocaleString()} sqft`],
                ["LIST PRICE", fmtAED(unit.price)],
              ].map((d) => (
                <div key={d[0]}>
                  <div className="text-[9px] font-mono text-navy-dim tracking-[1px]">
                    {d[0]}
                  </div>
                  <div className="text-[13px] font-semibold text-navy">
                    {d[1]}
                  </div>
                </div>
              ))}
              {loadingPlans && (
                <div className="text-[11px] font-mono text-gold ml-auto animate-pulse">
                  Loading plans...
                </div>
              )}
            </div>
          </div>

          <div
            className="flex gap-1 p-1 rounded-[6px] mb-4 overflow-x-auto scrollbar-none whitespace-nowrap"
            style={{ background: "#0A0E18" }}
          >
            {[
              { id: "normal" as OfferMode, label: "Normal Plan" },
              { id: "event" as OfferMode, label: "Event/Special Plan" },
              { id: "allplans" as OfferMode, label: "All Plans PDF" },
              { id: "comparison" as OfferMode, label: "Comparison Table" },
              { id: "recovery" as OfferMode, label: "AI Recovery Plan" },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setOfferMode(m.id);
                  setPlan(null);
                  setSelectedPlanIds(
                    m.id === "comparison" ? resolvedPlans.map((p) => p.id) : [],
                  );
                  setIsEvent(m.id === "event");
                }}
                className="flex-1 text-center p-[9px_12px] rounded-[6px] cursor-pointer text-[11px] shrink-0 whitespace-nowrap"
                style={{
                  background:
                    offerMode === m.id
                      ? "rgba(201,168,76,0.05)"
                      : "transparent",
                  color: offerMode === m.id ? "#C9A84C" : "#8892A8",
                  fontWeight: offerMode === m.id ? 600 : 400,
                  border:
                    offerMode === m.id
                      ? "1px solid #C9A84C"
                      : "1px solid transparent",
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* All Plans / Comparison -- Plan Selector */}
          {(offerMode === "allplans" || offerMode === "comparison") && (
            <div
              className="p-[24px_28px] rounded-[10px] border border-border mb-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
              style={{ background: "#fff" }}
            >
              <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-2.5">
                {offerMode === "allplans"
                  ? "SELECT PLANS TO INCLUDE IN PDF:"
                  : "SELECT PLANS TO COMPARE:"}
              </div>
              {availPlans.map((p) => {
                const checked = selectedPlanIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() =>
                      setSelectedPlanIds((prev) =>
                        checked
                          ? prev.filter((x) => x !== p.id)
                          : [...prev, p.id],
                      )
                    }
                    className="flex items-center gap-2.5 p-[10px_14px] rounded-[6px] mb-2 cursor-pointer border"
                    style={{
                      background: checked
                        ? `rgba(${parseInt(pc.slice(1, 3), 16)},${parseInt(pc.slice(3, 5), 16)},${parseInt(pc.slice(5, 7), 16)},0.08)`
                        : "#fff",
                      borderColor: checked ? pc : "#D0DCF0",
                    }}
                  >
                    <div
                      className="w-[20px] h-[20px] rounded border-2 flex items-center justify-center text-[12px] text-white shrink-0"
                      style={{
                        borderColor: checked ? pc : "#D0DCF0",
                        background: checked ? pc : "transparent",
                      }}
                    >
                      {checked ? "v" : ""}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-navy">
                        {p.label}
                      </div>
                      <div className="text-[11px] text-navy-light">
                        {p.dp}% DP{" "}
                        {p.installmentPct > 0 ? `${p.installmentPct}%/mo ` : ""}
                        {p.durationType === "fixed_months"
                          ? `${p.durationMonths}mo`
                          : "till handover"}{" "}
                        {p.discount}% disc
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedPlanIds.length === 0 && (
                <div
                  className="text-[11px] text-orange p-[6px_10px] rounded-[5px]"
                  style={{ background: "rgba(200,100,10,0.08)" }}
                >
                  Select at least one plan above
                </div>
              )}
            </div>
          )}

          {/* DP Split for allplans, event, recovery */}
          {(offerMode === "allplans" ||
            offerMode === "event" ||
            offerMode === "recovery") &&
            proj && (
              <div
                className="p-[14px_16px] rounded-[10px] border border-border mb-4"
                style={{ background: "#F0F4FA" }}
              >
                <div className={lbl}>Down Payment Split</div>
                <div className="text-[11px] text-navy-dim mb-2">
                  Select how many months to split the DP across
                </div>
                <select
                  className={selS}
                  value={split}
                  onChange={(e) => setSplit(+e.target.value)}
                >
                  {[...(proj.dpSplitOptions || [1])]
                    .sort((a, b) => a - b)
                    .map((n) => (
                      <option key={n} value={n}>
                        {n === 1
                          ? "Full DP in 1 payment"
                          : `${n} equal monthly payments`}
                      </option>
                    ))}
                </select>
              </div>
            )}

          {/* Normal / Event -- Plan Cards */}
          {(offerMode === "normal" || offerMode === "event") &&
            (resolvedPlans.length === 0 ? (
              <div className="bg-white border border-border rounded-[10px] p-8 text-center text-[13px] text-navy-dim mb-4 w-full">
                No {offerMode === "event" ? "event/special" : "normal"} plans
                available for this unit.
              </div>
            ) : (
              <div
                className="grid gap-3 mb-4 w-full"
                style={{
                  gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                }}
              >
                {resolvedPlans.map((p) => {
                  const effDisc =
                    (offerMode === "event" && p.eventDiscount
                      ? p.eventDiscount
                      : p.discount) + (extraDiscount || 0);
                  const effPrice3 =
                    priceOverride && +priceOverride > 0
                      ? +priceOverride
                      : unit.price;
                  const netP = effPrice3 * (1 - effDisc / 100);
                  const selected = plan?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setPlan(p);
                        setIsEvent(offerMode === "event");
                      }}
                      className={`py-6 px-7 rounded-[10px] cursor-pointer border-2 border-[rgb(208, 220, 240)] shadow-md transition-all ${
                        selected ? "border-2" : "border border-border"
                      }`}
                      style={{
                        background: selected
                          ? `rgba(${parseInt(pc.slice(1, 3), 16)},${parseInt(pc.slice(3, 5), 16)},${parseInt(pc.slice(5, 7), 16)},0.04)`
                          : "#fff",
                        borderColor: selected ? pc : undefined,
                      }}
                    >
                      <div className="flex justify-between mb-2">
                        <div className="text-[13px] font-semibold text-navy">
                          {p.label}
                        </div>
                        <span className="inline-flex items-center rounded px-2 text-[10px] font-mono border bg-green-dim text-green border-[rgba(26,138,90,0.3)]">
                          {effDisc}% OFF
                        </span>
                      </div>
                      {[
                        ["DP", `${p.dp}%`],
                        [
                          "Install/mo",
                          p.installmentPct > 0
                            ? `${p.installmentPct}%`
                            : "None",
                        ],
                        [
                          "Duration",
                          p.durationType === "fixed_months"
                            ? `${p.durationMonths} months`
                            : "Till Handover",
                        ],
                        ["Discount", `${effDisc}%`],
                      ].map((d) => (
                        <div key={d[0]} className="flex justify-between mb-1">
                          <span className="text-[11px] text-navy-light">
                            {d[0]}
                          </span>
                          <span className="text-[11px] font-semibold text-navy">
                            {d[1]}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="text-[12px] text-navy-dim">
                          Net Price:{" "}
                          <strong style={{ color: pc }}>{fmtAED(netP)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          {/* AI Recovery Plan */}
          {offerMode === "recovery" && (
            <div>
              <div
                className="p-[24px_28px] rounded-[10px] border border-border mb-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
                style={{ background: "#fff" }}
              >
                <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-1.5">
                  SELECT BASE PLAN
                </div>
                <div className="text-[11px] text-navy-dim mb-3">
                  Only plans with monthly installments qualify. 30/70, 100/0
                  type plans are excluded.
                </div>
                <div
                  className="grid gap-2.5"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                  }}
                >
                  {availPlans
                    .filter((p) => +p.installmentPct > 0)
                    .map((p) => {
                      const sel = recoveryBaseId === p.id;
                      const effDisc = (p.discount || 0) + (extraDiscount || 0);
                      const effPrice =
                        priceOverride && +priceOverride > 0
                          ? +priceOverride
                          : unit.price;
                      const netP = effPrice * (1 - effDisc / 100);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setRecoveryBaseId(p.id);
                            setRecoverySchedule(null);
                          }}
                          className={`p-[14px_16px] rounded-[10px] cursor-pointer transition-all ${
                            sel ? "border-2" : "border-2 border-border"
                          }`}
                          style={{
                            background: sel
                              ? `rgba(${parseInt(pc.slice(1, 3), 16)},${parseInt(pc.slice(3, 5), 16)},${parseInt(pc.slice(5, 7), 16)},0.04)`
                              : "#fff",
                            borderColor: sel ? pc : undefined,
                          }}
                        >
                          <div className="text-[13px] font-semibold text-navy mb-1.5">
                            {p.label}
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono border bg-green-dim text-green border-[rgba(26,138,90,0.3)]">
                              {effDisc}% OFF
                            </span>
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono border bg-blue-dim text-blue border-[rgba(30,111,217,0.3)]">
                              {p.dp}% DP
                            </span>
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono border bg-orange-dim text-orange border-[rgba(200,100,10,0.3)]">
                              {p.installmentPct}%/mo
                            </span>
                          </div>
                          <div className="text-[11px] text-navy-dim mt-1.5">
                            {fmtAED(netP)}
                          </div>
                        </div>
                      );
                    })}
                  {availPlans.filter((p) => +p.installmentPct > 0).length ===
                    0 && (
                    <div
                      className="text-[12px] text-orange p-3 rounded-[6px]"
                      style={{ background: "rgba(200,100,10,0.08)" }}
                    >
                      No installment plans found for this unit type.
                    </div>
                  )}
                </div>
              </div>

              {recoveryBaseId && (
                <div
                  className="p-[24px_28px] rounded-[10px] border border-border mb-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
                  style={{ background: "#fff" }}
                >
                  <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-3">
                    RECOVERY PARAMETERS
                  </div>
                  <div className="mb-4">
                    {(() => {
                      const bp = availPlans.find(
                        (p) => p.id === recoveryBaseId,
                      ) || { installmentPct: 1, discount: 0 };
                      const bpNetPrice =
                        (priceOverride && +priceOverride > 0
                          ? +priceOverride
                          : unit.price) *
                        (1 - ((bp.discount || 0) + (extraDiscount || 0)) / 100);
                      return (
                        <div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-1.5 uppercase">
                                REDUCED MONTHLY % (original: {bp.installmentPct}
                                %/mo)
                              </div>
                              <input
                                className={inp}
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={recoveryMonthlyPct}
                                onChange={(e) => {
                                  const pct = e.target.value;
                                  setRecoveryMonthlyPct(pct);
                                  setRecoverySchedule(null);
                                }}
                                placeholder="e.g. 0.5"
                              />
                              {recoveryMonthlyPct &&
                                +recoveryMonthlyPct > 0 && (
                                  <div className="text-[10px] text-green mt-[3px]">
                                    {fmtAED(
                                      Math.round(
                                        (bpNetPrice * +recoveryMonthlyPct) /
                                          100,
                                      ),
                                    )}
                                    /mo
                                  </div>
                                )}
                            </div>
                            <div>
                              <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-1.5 uppercase">
                                RECOVERY FREQUENCY
                              </div>
                              <select
                                className={selS}
                                value={recoveryFreq}
                                onChange={(e) => {
                                  setRecoveryFreq(+e.target.value);
                                  setRecoverySchedule(null);
                                }}
                              >
                                <option value={3}>Every 3 months</option>
                                <option value={6}>Every 6 months</option>
                                <option value={9}>Every 9 months</option>
                                <option value={12}>
                                  Every 12 months (Annual)
                                </option>
                              </select>
                            </div>
                          </div>
                          {recoveryMonthlyPct &&
                            +recoveryMonthlyPct >= bp.installmentPct && (
                              <div className="text-[11px] text-orange mt-1.5">
                                Must be less than original {bp.installmentPct}
                                %/mo
                              </div>
                            )}
                        </div>
                      );
                    })()}
                  </div>

                  {recoveryMonthlyPct &&
                    +recoveryMonthlyPct > 0 &&
                    (() => {
                      const bp = availPlans.find(
                        (p) => p.id === recoveryBaseId,
                      ) || { installmentPct: 1, discount: 0 };
                      const netP = unit.price * (1 - (bp.discount || 0) / 100);
                      const orig = bp.installmentPct;
                      const red = +recoveryMonthlyPct;
                      if (red >= orig) return null;
                      const deferred = orig - red;
                      const regularAmt = Math.round((netP * red) / 100);
                      const recoveryAmt = Math.round(
                        (netP * (red + deferred * recoveryFreq)) / 100,
                      );
                      const lockAmt = Math.round((netP * orig) / 100);
                      return (
                        <div
                          className="p-[12px_16px] rounded-[6px] mb-4 border"
                          style={{
                            background: "rgba(184, 134, 11, 0.1)",
                            borderColor: "rgba(184,134,11,0.2)",
                          }}
                        >
                          <div className="text-[9px] font-mono text-gold tracking-[1.5px] mb-2">
                            STRUCTURE PREVIEW
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <div className="text-[9px] text-navy-dim">
                                MONTHLY
                              </div>
                              <div className="text-[14px] font-bold text-gold">
                                {fmtAED(regularAmt)}
                              </div>
                              <div className="text-[9px] text-navy-dim">
                                {red}%/mo
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-navy-dim">
                                EVERY {recoveryFreq} MONTHS
                              </div>
                              <div className="text-[14px] font-bold text-gold">
                                {fmtAED(recoveryAmt)}
                              </div>
                              <div className="text-[9px] text-navy-dim">
                                {red}%+{(deferred * recoveryFreq).toFixed(1)}%
                                recovery
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-navy-dim">
                                LAST 6 MONTHS
                              </div>
                              <div className="text-[14px] font-bold text-gold">
                                {fmtAED(lockAmt)}
                              </div>
                              <div className="text-[9px] text-navy-dim">
                                Standard {orig}%/mo
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  <button
                    disabled={
                      !recoveryMonthlyPct ||
                      +recoveryMonthlyPct <= 0 ||
                      +recoveryMonthlyPct >=
                        (availPlans.find((p) => p.id === recoveryBaseId)
                          ?.installmentPct || 1) ||
                      recoveryGenerating
                    }
                    onClick={handleGenerateRecovery}
                    className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white disabled:opacity-40 bg-green hover:bg-[#15724C] border-none"
                  >
                    {recoveryGenerating
                      ? "AI is generating schedule..."
                      : "Generate Recovery Schedule with AI"}
                  </button>

                  {recoveryError && (
                    <div
                      className="text-[12px] text-red mt-2 p-[8px_12px] rounded-[6px]"
                      style={{ background: "rgba(192,57,43,0.08)" }}
                    >
                      {recoveryError}
                    </div>
                  )}
                </div>
              )}

              {recoverySchedule && (
                <div
                  className="p-[24px_28px] rounded-[10px] border border-border mb-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
                  style={{ background: "#fff" }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-[11px] font-mono text-green tracking-[1.5px]">
                      AI GENERATED RECOVERY SCHEDULE
                    </div>
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono border bg-green-dim text-green border-[rgba(26,138,90,0.3)]">
                      {recoverySchedule.rows.length} payments
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-border rounded-[8px] mb-3">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-surface">
                          {["#", "MILESTONE", "DATE", "AMOUNT"].map((h) => (
                            <th
                              key={h}
                              className={`px-3 py-[9px] text-[11px] text-navy-light tracking-[1.4px] uppercase font-mono border-b border-border whitespace-nowrap ${
                                h === "AMOUNT" ? "text-right" : "text-left"
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recoverySchedule.rows.map((r, i) => {
                          const isRec = r.type === "recovery";
                          const isComp = r.type === "completion";
                          return (
                            <tr
                              key={i}
                              className="border-b border-border hover:bg-[#F8FAFF] transition-colors"
                            >
                              <td
                                className={`px-3 py-[11px] text-[11px] w-[28px] whitespace-nowrap ${
                                  isComp
                                    ? "text-green font-semibold"
                                    : isRec
                                      ? "text-blue"
                                      : "text-navy-dim"
                                }`}
                              >
                                {i + 1}
                              </td>
                              <td
                                className="px-3 text-[13px] py-[13px] whitespace-nowrap"
                                style={{
                                  fontWeight: isRec || isComp ? 600 : 400,
                                  color: isRec
                                    ? pc
                                    : isComp
                                      ? "#1A8A5A"
                                      : "#1A2340",
                                }}
                              >
                                {r.label}
                                {isRec && (
                                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-mono border ml-1.5 bg-green-dim text-green border-[rgba(26,138,90,0.3)] whitespace-nowrap">
                                    RECOVERY
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-[11px] text-[11px] text-navy-dim whitespace-nowrap">
                                {r.date ? fmtDate(r.date) : ""}
                              </td>
                              <td
                                className="px-3 py-[11px] text-[13px] font-semibold text-right font-mono whitespace-nowrap"
                                style={{
                                  color: isRec
                                    ? pc
                                    : isComp
                                      ? "#1A8A5A"
                                      : "#1A2340",
                                }}
                              >
                                {fmtAED(r.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* <button
                    onClick={() => {
                      setRecoverySchedule(null);
                      setRecoveryMonthlyPct("");
                      setRecoveryBaseId("");
                    }}
                    className="h-[38px] px-4 rounded-[6px] text-sm cursor-pointer border border-border text-navy bg-white hover:bg-surface"
                  >
                    Regenerate
                  </button> */}
                </div>
              )}
            </div>
          )}

          {/* Payment Structure Preview for Normal/Event */}
          {(offerMode === "normal" || offerMode === "event") && plan && (
            <div
              className="p-[24px_28px] rounded-[10px] border border-border mb-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
              style={{ background: "#fff" }}
            >
              <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-3">
                PAYMENT STRUCTURE PREVIEW
              </div>
              <PaymentBar
                plan={effPlan || plan}
                netPrice={unit.price * (1 - activeDiscount / 100)}
                primaryColor={pc}
                secondaryColor={proj.secondaryColor}
                handoverMonths={getHandoverMonths(proj.completionDate)}
              />
            </div>
          )}

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setStep(2)}
              className="h-[38px] px-4 rounded-[6px] text-sm cursor-pointer text-white border-none"
              style={{ background: "#1A2340" }}
            >
              Back
            </button>
            <button
              disabled={
                !(
                  plan ||
                  offerMode === "allplans" ||
                  offerMode === "comparison" ||
                  (offerMode === "recovery" && !!recoverySchedule)
                )
              }
              onClick={() => setStep(4)}
              className="h-[38px] px-6 rounded-[6px] text-sm font-bold cursor-pointer text-white bg-green hover:bg-[#15724C] border-none disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Generate */}
      {step === 4 && proj && unit && (
        <div>
          <button
            onClick={() => setStep(3)}
            className="h-[38px] px-4 rounded-[6px] text-[12px] cursor-pointer mb-4 text-white border-none"
            style={{ background: "#1A2340" }}
          >
            Back to Payment Plan
          </button>

          <div
            className="p-[24px_28px] rounded-[10px] border border-border mb-4 shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
            style={{ background: "#fff" }}
          >
            <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-4">
              OFFER SUMMARY
            </div>
            {[
              ["Project", proj.name],
              ["Unit", `${unit.number} - ${unitType?.label || ""}`],
              [
                "Mode",
                offerMode === "allplans"
                  ? "All Plans PDF"
                  : offerMode === "comparison"
                    ? "Comparison Table"
                    : offerMode === "event"
                      ? "Event/Special Plan"
                      : "Normal Plan",
              ],
              [
                "Plan",
                plan?.label || `${selectedPlanIds.length} plans selected`,
              ],
              ["List Price", fmtAED(unit.price)],
            ].map((d) => (
              <div
                key={d[0]}
                className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border gap-1 sm:gap-4"
              >
                <span className="text-[12px] text-navy-light shrink-0">
                  {d[0]}
                </span>
                <span className="text-[12px] font-semibold text-navy text-left sm:text-right break-words">
                  {d[1]}
                </span>
              </div>
            ))}
          </div>

          <div
            className="p-[14px_16px] rounded-[10px] border border-border mb-4"
            style={{ background: "#F0F4FA" }}
          >
            <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-3">
              OFFER PARAMETERS
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <div className={lbl}>DAY 7 PAYMENT (AED)</div>
                <input
                  className={inp}
                  type="number"
                  value={day7Input}
                  onChange={(e) => setDay7Input(+e.target.value)}
                  placeholder="30000"
                />
                {(() => {
                  const bookingTok = proj.bookingToken || DEFAULT_BOOKING_TOKEN;
                  let maxDay7: number | null = null;
                  if (
                    (offerMode === "normal" || offerMode === "event") &&
                    (effPlan || plan)
                  ) {
                    const p = (effPlan || plan)!;
                    const ep =
                      priceOverride && +priceOverride > 0
                        ? +priceOverride
                        : unit.price;
                    const np = ep * (1 - activeDiscount / 100);
                    maxDay7 = Math.round((np * p.dp) / 100) - bookingTok;
                  } else if (offerMode === "recovery") {
                    const bp = recoveryBaseId
                      ? availPlans.find((p) => p.id === recoveryBaseId)
                      : recoverySchedule?.basePlan;
                    if (bp) {
                      const ep =
                        priceOverride && +priceOverride > 0
                          ? +priceOverride
                          : unit.price;
                      const td = (bp.discount || 0) + (extraDiscount || 0);
                      const np = ep * (1 - td / 100);
                      maxDay7 = Math.round((np * bp.dp) / 100) - bookingTok;
                    }
                  }
                  if (maxDay7 !== null && +day7Input > maxDay7) {
                    return (
                      <div className="text-[11px] text-orange mt-1">
                        Max Day 7 is {fmtAED(maxDay7)} (remaining DP)
                      </div>
                    );
                  }
                  return (
                    <div className="text-[10px] text-navy-dim mt-0.5">
                      First payment from DP split
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1 min-w-[160px]">
                <div className={lbl}>OVERRIDE UNIT PRICE (AED)</div>
                <input
                  className={inp}
                  type="number"
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                  placeholder={`Default: ${fmtAED(unit.price)}`}
                />
                {priceOverride && +priceOverride > 0 && (
                  <div className="text-[11px] text-green mt-[3px] font-mono">
                    AED {(+priceOverride).toLocaleString("en-US")}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-[160px]">
                <div className={lbl}>EXTRA DISCOUNT</div>
                <select
                  className={selS}
                  value={extraDiscount}
                  onChange={(e) => setExtraDiscount(+e.target.value)}
                >
                  <option value={0}>None</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}% extra
                    </option>
                  ))}
                </select>
                {extraDiscount > 0 && (
                  <div className="text-[10px] text-green mt-0.5">
                    +{extraDiscount}% additional discount applied
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className={lbl}>CLIENT FULL NAME</div>
            <input
              className={inp}
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Enter client full name..."
            />
          </div>

          <div className="mb-4">
            <div className={lbl}>CLIENT WHATSAPP NUMBER (OPTIONAL)</div>
            <input
              className={inp}
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="971501234567..."
            />
          </div>

          <div
            className="p-[14px_16px] rounded-[10px] border border-border mb-4"
            style={{ background: "#F0F4FA" }}
          >
            <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-2.5">
              AGENT DETAILS ON OFFER
            </div>
            <div className="text-[11px] text-navy-dim mb-2.5">
              Uncheck what you do not want shown on this offer
            </div>
            {[
              ["showAgentName", `Show name: ${user?.name}`],
              [
                "showAgentPhone",
                `Show phone: ${(user as Record<string, string> | null)?.phone || "(not set -- add in profile)"}`,
              ],
              [
                "showAgentEmail",
                `Show email: ${(user as Record<string, string> | null)?.profileEmail || user?.email || ""}`,
              ],
            ].map(([key, label]) => (
              <div
                key={key}
                onClick={() =>
                  setAgentToggles((prev) => ({
                    ...prev,
                    [key]: !prev[key as keyof typeof agentToggles],
                  }))
                }
                className="flex items-center gap-2.5 py-[7px] cursor-pointer border-b border-border"
              >
                <div
                  className="w-[18px] h-[18px] rounded border-2 flex items-center justify-center text-[11px] text-white shrink-0"
                  style={{
                    borderColor: agentToggles[key as keyof typeof agentToggles]
                      ? "#1A8A5A"
                      : "#D0DCF0",
                    background: agentToggles[key as keyof typeof agentToggles]
                      ? "#1A8A5A"
                      : "transparent",
                  }}
                >
                  {agentToggles[key as keyof typeof agentToggles] ? "✓" : ""}
                </div>
                <span className="text-[12px] text-navy">{label}</span>
              </div>
            ))}
          </div>

          {(offerMode === "normal" || offerMode === "event") && plan && (
            <div className="mb-4">
              <div className={lbl}>Down Payment Split</div>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
                <div className="flex-1 min-w-0">
                  <select
                    className={selS}
                    value={split}
                    onChange={(e) => setSplit(+e.target.value)}
                  >
                    {[...(proj.dpSplitOptions || [1])]
                      .sort((a, b) => a - b)
                      .map((n) => {
                        const dpAmt =
                          (unit.price *
                            (1 - (plan.discount || 0) / 100) *
                            plan.dp) /
                          100;
                        const eachAmt =
                          n === 1 ? dpAmt - 30000 : (dpAmt - 30000) / n;
                        return (
                          <option key={n} value={n}>
                            {n === 1
                              ? "Full DP in 1 payment"
                              : `${n} monthly payments`}{" "}
                            - {fmtAED(Math.round(eachAmt))}/payment
                          </option>
                        );
                      })}
                  </select>
                </div>
                {(proj.dpSplitOptions || [1]).length > 1 && (
                  <div
                    className="p-[10px_14px] rounded-[6px] shrink-0 text-[12px] text-center sm:text-left"
                    style={{
                      background: "rgba(184,134,11,0.05)",
                      border: "1px solid rgba(184,134,11,0.25)",
                      color: "#B8860B",
                    }}
                  >
                    {split === 1
                      ? "Full DP at once"
                      : `${split} x ${fmtAED(Math.round(((unit.price * (1 - (plan.discount || 0) / 100) * plan.dp) / 100 - 30000) / split))}`}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-navy-dim mt-1.5">
                Note: Booking token AED 20,000 (Day 0) + DP 1 AED 30,000 (Day 7)
                are fixed. Remaining DP splits from Day 30.
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className={lbl}>ADDITIONAL CURRENCY</div>
            <div className="flex gap-2 flex-wrap mb-3">
              {[
                { code: "", label: "None" },
                { code: "USD", label: "USD" },
                ...EXTRA_CURRENCIES.map((c) => ({
                  code: c.code,
                  label: c.code,
                })),
              ].map((c) => {
                const isNone = c.code === "";
                const isSelected = extraCurrency === c.code;
                const borderStyle = isSelected
                  ? isNone
                    ? `1px solid ${pc}`
                    : "1px solid #1A8A5A"
                  : "1px solid #D0DCF0";
                const bgStyle = isSelected
                  ? isNone
                    ? `rgba(${parseInt(pc.slice(1, 3), 16)},${parseInt(pc.slice(3, 5), 16)},${parseInt(pc.slice(5, 7), 16)},0.1)`
                    : "rgba(26, 138, 90, 0.08)"
                  : "#fff";
                const colorStyle = isSelected
                  ? isNone
                    ? pc
                    : "#1A8A5A"
                  : "#4A5880";
                return (
                  <div
                    key={c.code}
                    onClick={() => {
                      setExtraCurrency(c.code);
                    }}
                    className="px-4 py-2 rounded-[6px] cursor-pointer text-[12px] border"
                    style={{
                      border: borderStyle,
                      background: bgStyle,
                      color: colorStyle,
                    }}
                  >
                    {c.label}
                  </div>
                );
              })}
            </div>
            {extraCurrency && (
              <div className="p-[10px_16px] rounded-[6px] flex items-center gap-3.5 flex-wrap bg-[#E8F0FE] border border-[#BDD1EB] text-[13px] text-navy">
                <span className="shrink-0">1 AED =</span>
                <input
                  className={`${inp} w-[100px] h-[34px] bg-[#F1F5F9] text-navy-light cursor-not-allowed`}
                  type="number"
                  step="0.0001"
                  value={liveRate}
                  disabled
                  placeholder={`e.g. ${ratesFromSettings[extraCurrency] || "0.000"}`}
                />
                <span className="font-semibold uppercase">{extraCurrency}</span>
                {liveRate && +liveRate > 0 && (
                  <span className="text-[12px] text-green font-semibold ml-2">
                    1M AED = {extraCurrency}{" "}
                    {Math.round(1000000 * +liveRate).toLocaleString()}
                  </span>
                )}
                {!liveRate && (
                  <span className="text-[12px] text-orange ml-2">
                    No exchange rate available for {extraCurrency} in settings
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={
                !client.trim() ||
                (offerMode === "comparison" && selectedPlanIds.length === 0)
              }
              onClick={handleDone}
              className="flex-1 p-[14px] rounded-[6px] text-[14px] font-bold text-white bg-green border-none disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:bg-[#146b45] w-full text-center"
            >
              Done
            </button>
            <button
              disabled={
                !client.trim() ||
                (offerMode === "comparison" && selectedPlanIds.length === 0)
              }
              onClick={handleGenerate}
              className="flex-1 p-[14px] rounded-[6px] text-[14px] font-bold text-white bg-green border-none disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:bg-[#15724C] w-full text-center"
            >
              {offerMode === "comparison"
                ? `Generate Comparison Table (${selectedPlanIds.length} plans)`
                : offerMode === "allplans"
                  ? `Generate All Plans PDF (${selectedPlanIds.length} plans)`
                  : offerMode === "recovery"
                    ? "Generate Recovery Offer PDF"
                    : "Generate Offer PDF"}
            </button>

            {/* <button
              disabled={
                !client.trim() ||
                (offerMode === "comparison" && selectedPlanIds.length === 0)
              }
              onClick={handleDone}
              className="flex-1 p-[14px] rounded-[6px] text-[14px] font-bold text-white bg-green border-none disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:bg-[#146b45] w-full text-center"
            >
              Done
            </button> */}
          </div>

          {/* {clientPhone && client && (
            <div className="mt-3 text-center">
              <a
                href={`https://wa.me/${clientPhone.replace(/[^0-9]/g, "")}?text=Dear ${encodeURIComponent(client)}, please find your property offer from Reportage Properties attached.`}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-5 py-2.5 rounded-[6px] text-sm cursor-pointer border border-border text-navy bg-white hover:bg-surface no-underline"
              >
                Send via WhatsApp
              </a>
            </div>
          )} */}
        </div>
      )}
    </div>
  );
}

function PaymentBar({
  plan,
  netPrice,
  primaryColor,
  secondaryColor,
  handoverMonths,
}: {
  plan: PaymentPlan;
  netPrice: number;
  primaryColor: string;
  secondaryColor?: string;
  handoverMonths: number;
}) {
  const pc = primaryColor || "#B8860B";
  const sc = secondaryColor || "#A8C5E8";
  const ho = adjustColor(pc, -0.15);
  const hasInst = plan.installmentPct > 0;
  let instPct = 0;
  let hoPct = plan.onHandover || 0;

  if (hasInst) {
    if (plan.durationType === "fixed_months" && plan.durationMonths) {
      instPct = Math.min(
        plan.installmentPct * plan.durationMonths,
        100 - plan.dp,
      );
      hoPct = Math.max(0, 100 - plan.dp - instPct);
    } else {
      const instMonths = Math.max(0, (handoverMonths || 18) - 2);
      instPct = Math.min(plan.installmentPct * instMonths, 100 - plan.dp);
      hoPct = Math.max(0, Math.round((100 - plan.dp - instPct) * 10) / 10);
    }
  } else if (hoPct === 0) {
    hoPct = 100 - plan.dp;
  }

  const segs =
    hasInst && instPct > 0
      ? [
          { label: "Down Payment", pct: plan.dp, color: pc },
          {
            label: `${plan.installmentPct}% Monthly`,
            pct: Math.round(instPct),
            color: sc,
          },
          { label: "On Completion", pct: Math.round(hoPct), color: ho },
        ]
      : [
          { label: "Down Payment", pct: plan.dp, color: pc },
          { label: "On Completion", pct: Math.round(hoPct), color: ho },
        ];

  return (
    <div className="mb-4">
      <div
        className="h-[32px] rounded-[6px] overflow-hidden flex mb-2"
        style={{ background: "#F0F4FA" }}
      >
        {segs.map((s, i) => (
          <div
            key={i}
            style={{
              flex: s.pct,
              background: s.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "#fff",
              minWidth: s.pct > 5 ? 20 : 0,
            }}
          >
            {s.pct > 8 ? `${s.pct}%` : ""}
          </div>
        ))}
      </div>
      <div className="flex gap-4 flex-wrap text-[11px]">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-[10px] h-[10px] rounded-[2px]"
              style={{ background: s.color }}
            />
            <span className="text-navy-light">
              {s.label}: <strong>{s.pct}%</strong> ={" "}
              {fmtAED(Math.round((netPrice * s.pct) / 100))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OfferPreview({
  offer,
  settings,
  onClose,
}: {
  offer: Record<string, unknown>;
  settings: Record<string, unknown>;
  onClose: () => void;
}) {
  const project = offer.project as Project;
  const unit = offer.unit as Unit;
  const unitType = offer.unitType as UnitType | null;
  const plan = offer.plan as PaymentPlan;
  const schedule = offer.schedule as ScheduleRow[];
  const netPrice = offer.netPrice as number;
  const discountAmt = offer.discountAmt as number;
  const regFee = offer.regFee as number;
  const utility = offer.utility as number;
  const parking = offer.parking as number;
  const clientName = offer.clientName as string;
  const agentName = offer.agentName as string;
  const agentPhone = offer.agentPhone as string;
  const agentEmail = offer.agentEmail as string;
  const watermark = offer.watermark as string | null;
  const offerDate = offer.offerDate as Date;
  const extraCurrency = offer.extraCurrency as string | null;
  const liveRates = offer.liveRates as Record<string, number> | null;
  const eventName = offer.eventName as string;

  const pc = project.primaryColor || "#1A3C6B";
  const sc = project.secondaryColor || "#A8C5E8";
  const usdRate = 1 / 3.65;
  const extraRate =
    extraCurrency && liveRates ? liveRates[extraCurrency] : null;
  const extraSym = extraCurrency
    ? (
        EXTRA_CURRENCIES.find((c) => c.code === extraCurrency) || {
          symbol: extraCurrency + " ",
        }
      ).symbol
    : "";
  const hasPark = parking > 0 && project.type !== "Townhouses";
  const priceWithPark = netPrice + (hasPark ? parking : 0);
  const activeDiscount = plan.discount || 0;

  const hoMonths = getHandoverMonths(project.completionDate);

  const milestones = (schedule || []).map((r) => ({
    label: r.label,
    date: r.date ? fmtDate(r.date) : "",
    amount: r.amount,
    pct: netPrice > 0 ? Math.round((r.amount / netPrice) * 10000) / 100 : 0,
    type: r.type,
    isHandover: r.type === "handover",
    isBooking: r.type === "booking",
  }));

  const fp = (() => {
    const utFps = unitType?.floorPlans || {};
    const unitSub = unit.subtype || "";
    const normSub = (s: string) =>
      (s || "").toLowerCase().replace(/[\s_-]/g, "");
    const k =
      Object.keys(utFps).find(
        (kk) =>
          normSub(kk) === normSub(unitSub) ||
          normSub(unitSub).includes(normSub(kk)),
      ) || Object.keys(utFps).find((kk) => utFps[kk]);
    const fpData = k ? utFps[k] : null;
    if (!fpData) {
      const projFps = project.floorPlans || {};
      const pk =
        Object.keys(projFps).find((k) => k === unitType?.id) ||
        Object.values(projFps).find(Boolean);
      return pk || null;
    }
    return fpData;
  })() as { name?: string; dataUrl?: string; isImage?: boolean } | null;

  return (
    <div
      id="print-root"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(5,8,20,0.96)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "32px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 820 }}>
        <style
          dangerouslySetInnerHTML={{
            __html:
              "@media print{body,html{margin:0!important;padding:0!important;background:white!important;}#print-root{position:static!important;background:white!important;display:block!important;padding:0!important;overflow:visible!important;width:100%!important;}#offer-toolbar{display:none!important;}#offer-doc{box-shadow:none!important;border-radius:0!important;width:100%!important;max-width:100%!important;margin:0!important;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}.op{display:block!important;page-break-after:always!important;break-after:page!important;overflow:hidden!important;}.op:last-child{page-break-after:auto!important;break-after:auto!important;}",
          }}
        />
        <div
          id="offer-toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              letterSpacing: 2,
              fontFamily: "DM Mono,monospace",
            }}
          >
            OFFER PREVIEW
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => window.print(), 100);
              }}
              className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-linear-to-r from-gold to-[#C9A84C]"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="h-[38px] px-4 rounded-[6px] text-sm cursor-pointer text-white border"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                background: "transparent",
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div
          id="offer-doc"
          style={{
            borderRadius: 12,
            overflow: "hidden",
            fontFamily: "Outfit,sans-serif",
            boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
          }}
        >
          {/* Page 1: Cover */}
          <div
            className="op"
            style={{
              minHeight: 480,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              pageBreakAfter: "always",
              breakAfter: "page",
            }}
          >
            {watermark && (
              <div
                style={{
                  position: "absolute",
                  top: "40%",
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  opacity: 0.04,
                  fontSize: 48,
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "Cormorant Garamond,serif",
                  letterSpacing: 8,
                  transform: "rotate(-30deg)",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              >
                {watermark.startsWith("data:") ||
                watermark.startsWith("http") ? (
                  <img
                    src={watermark}
                    alt=""
                    style={{ width: 200, opacity: 0.3, margin: "0 auto" }}
                  />
                ) : (
                  watermark
                )}
              </div>
            )}
            {project.heroImage && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 0,
                }}
              >
                <img
                  src={project.heroImage as string}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      "linear-gradient(180deg,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.35) 50%,rgba(0,0,0,0.75) 100%)",
                  }}
                />
              </div>
            )}
            {!project.heroImage && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 0,
                  background: `linear-gradient(160deg,${pc},${pc}dd 40%,#0A0E18 80%)`,
                }}
              />
            )}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 480,
              }}
            >
              <div
                style={{
                  padding: "20px 48px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: project.heroImage
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(255,255,255,0.5)",
                      letterSpacing: 2,
                      fontFamily: "DM Mono,monospace",
                      marginBottom: 3,
                    }}
                  >
                    PREPARED FOR
                  </div>
                  <div
                    style={{
                      fontFamily: "Cormorant Garamond,serif",
                      fontSize: 20,
                      fontWeight: 600,
                      color: project.heroImage ? "#fff" : "#fff",
                    }}
                  >
                    {clientName || "Valued Client"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: project.heroImage
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.5)",
                      fontFamily: "DM Mono,monospace",
                      letterSpacing: 1,
                    }}
                  >
                    {fmtDate(offerDate || new Date())}
                  </div>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "40px 48px",
                  textAlign: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: project.heroImage
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.5)",
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    fontFamily: "DM Mono,monospace",
                    marginBottom: 16,
                  }}
                >
                  EXCLUSIVE PROPERTY OFFER
                </div>
                <div
                  style={{
                    fontFamily: "Cormorant Garamond,serif",
                    fontSize: 52,
                    fontWeight: 700,
                    color: project.heroImage ? "#fff" : "#fff",
                    lineHeight: 1.05,
                    marginBottom: 12,
                    letterSpacing: -1,
                  }}
                >
                  {project.name}
                </div>
                <div
                  style={{
                    width: 60,
                    height: 2,
                    background: `linear-gradient(90deg,transparent,${pc},transparent)`,
                    marginBottom: 16,
                  }}
                />
                <div
                  style={{
                    fontSize: 14,
                    color: project.heroImage
                      ? "rgba(255,255,255,0.75)"
                      : "rgba(255,255,255,0.6)",
                    letterSpacing: 1,
                  }}
                >
                  {project.location}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 16,
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: project.heroImage
                        ? "rgba(255,255,255,0.75)"
                        : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {project.type}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: project.heroImage
                        ? "rgba(255,255,255,0.75)"
                        : "rgba(255,255,255,0.6)",
                      opacity: 0.4,
                    }}
                  >
                    .
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: project.heroImage
                        ? "rgba(255,255,255,0.75)"
                        : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {project.status}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: project.heroImage
                        ? "rgba(255,255,255,0.75)"
                        : "rgba(255,255,255,0.6)",
                      opacity: 0.4,
                    }}
                  >
                    .
                  </span>
                  <span style={{ fontSize: 12, color: pc, fontWeight: 600 }}>
                    {project.completionDate}
                  </span>
                </div>
              </div>
              <div
                style={{
                  margin: "0 48px 24px",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: `1px solid ${project.heroImage ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)"}`,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))",
                  }}
                >
                  {(() => {
                    const cols: [string, string][] = [
                      ["UNIT", unit.number],
                      ["TYPE", unitType?.label || "-"],
                      [
                        "SUBTYPE",
                        unit.subtype || unitType?.subtypes?.join(", ") || "-",
                      ],
                      [
                        "INTERNAL AREA",
                        `${(unit.areaInternal || 0).toLocaleString()} sqft`,
                      ],
                      [
                        "EXTERNAL AREA",
                        `${(unit.areaExternal || 0).toLocaleString()} sqft`,
                      ],
                      [
                        "TOTAL AREA",
                        `${(unit.area || 0).toLocaleString()} sqft`,
                      ],
                    ];
                    if (project.type !== "Townhouses")
                      cols.push(["FLOOR", String(unit.floor)]);
                    return cols;
                  })().map((d, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "14px 16px",
                        background:
                          i % 2 === 0
                            ? `rgba(255,255,255,0.06)`
                            : `rgba(255,255,255,0.03)`,
                        borderRight:
                          i < 5 ? "1px solid rgba(255,255,255,0.1)" : "none",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 8,
                          color: "rgba(255,255,255,0.6)",
                          letterSpacing: 2,
                          textTransform: "uppercase",
                          fontFamily: "DM Mono,monospace",
                          marginBottom: 4,
                        }}
                      >
                        {d[0]}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#fff",
                          fontFamily: "Outfit,sans-serif",
                        }}
                      >
                        {d[1]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  padding: "16px 48px",
                  background: project.heroImage
                    ? "rgba(0,0,0,0.3)"
                    : "rgba(255,255,255,0.08)",
                  borderTop: `1px solid ${project.heroImage ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.6)",
                      letterSpacing: 2,
                      fontFamily: "DM Mono,monospace",
                      marginBottom: 3,
                    }}
                  >
                    PREPARED FOR
                  </div>
                  <div
                    style={{
                      fontFamily: "Cormorant Garamond,serif",
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    {clientName || "Valued Client"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
                    {agentName}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 2,
                    }}
                  >
                    {(settings.teamName as string) || "Reportage Properties"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2: The Offer */}
          <div
            className="op"
            style={{
              background: "#fff",
              position: "relative",
              overflow: "hidden",
              pageBreakAfter: "always",
              breakAfter: "page",
            }}
          >
            <WatermarkPreview
              watermark={watermark}
              teamName={settings.teamName as string}
            />
            <div
              style={{
                height: 3,
                background: `linear-gradient(90deg,${pc},${sc})`,
              }}
            />
            {project.whyBuy && (project.whyBuy as string[]).length > 0 && (
              <div
                style={{
                  padding: "14px 48px",
                  background: `rgba(${hexRgb(pc)},0.04)`,
                  borderBottom: "1px solid #e8ecf2",
                  display: "flex",
                  gap: 24,
                  flexWrap: "wrap",
                }}
              >
                {(project.whyBuy as string[]).map((pt, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: pc,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#4A5880" }}>{pt}</span>
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                padding: "36px 48px",
                borderBottom: "1px solid #e8ecf2",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 40,
                  alignItems: "start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#8892AA",
                      letterSpacing: 2.5,
                      textTransform: "uppercase",
                      fontFamily: "DM Mono,monospace",
                      marginBottom: 16,
                    }}
                  >
                    INVESTMENT
                  </div>
                  {discountAmt > 0 && (
                    <div
                      style={{
                        fontSize: 14,
                        color: "#8892AA",
                        textDecoration: "line-through",
                        fontFamily: "DM Mono,monospace",
                        marginBottom: 4,
                      }}
                    >
                      {fmtAED(
                        activeDiscount < 100
                          ? netPrice / (1 - activeDiscount / 100)
                          : netPrice,
                      )}
                    </div>
                  )}
                  {discountAmt > 0 && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: `rgba(${hexRgb(pc)},0.1)`,
                        border: `1px solid rgba(${hexRgb(pc)},0.2)`,
                        borderRadius: 20,
                        padding: "4px 14px",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: pc,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: pc,
                          fontWeight: 700,
                          fontFamily: "DM Mono,monospace",
                          letterSpacing: 1,
                        }}
                      >
                        {activeDiscount}% DISCOUNT
                        {eventName ? ` - ${eventName}` : ""}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "Cormorant Garamond,serif",
                      fontSize: 42,
                      fontWeight: 700,
                      color: pc,
                      lineHeight: 1,
                      marginBottom: 4,
                      letterSpacing: -1,
                    }}
                  >
                    {fmtAED(netPrice)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8892AA",
                      fontFamily: "DM Mono,monospace",
                      marginBottom: 16,
                    }}
                  >
                    NET PRICE
                  </div>
                  {hasPark && (
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#4A5880",
                          marginBottom: 4,
                        }}
                      >
                        {(() => {
                          const lbl = unitType?.label || "";
                          const m = lbl.toLowerCase().match(/(\d+)\s*[b]/);
                          const beds = m ? +m[1] : 1;
                          const spaces = beds >= 3 ? 2 : 1;
                          return `+ Parking (${spaces} space${spaces > 1 ? "s" : ""}) = ${fmtAED(parking)}`;
                        })()}
                      </div>
                      <div
                        style={{
                          fontFamily: "Cormorant Garamond,serif",
                          fontSize: 26,
                          fontWeight: 700,
                          color: "#1E6FD9",
                          letterSpacing: -0.5,
                        }}
                      >
                        {fmtAED(priceWithPark)}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#1E6FD9",
                          fontFamily: "DM Mono,monospace",
                        }}
                      >
                        FINAL UNIT PRICE
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "#F0F4FA",
                      borderRadius: 8,
                      border: "1px solid #D0DCF0",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#8892AA",
                          fontFamily: "DM Mono,monospace",
                          letterSpacing: 1,
                          marginBottom: 2,
                        }}
                      >
                        {(project.feeLabel || "REG FEE").toUpperCase()}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1A2340",
                          fontFamily: "DM Mono,monospace",
                        }}
                      >
                        {fmtAED(regFee)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#8892AA",
                          fontFamily: "DM Mono,monospace",
                          letterSpacing: 1,
                          marginBottom: 2,
                        }}
                      >
                        UTILITY
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1A2340",
                          fontFamily: "DM Mono,monospace",
                        }}
                      >
                        {fmtAED(utility)}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  {discountAmt > 0 && (
                    <div
                      style={{
                        background: "rgba(39,174,96,0.06)",
                        border: "1px solid rgba(39,174,96,0.2)",
                        borderRadius: 12,
                        padding: "20px 24px",
                        marginBottom: 16,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: -30,
                          right: -30,
                          width: 100,
                          height: 100,
                          borderRadius: "50%",
                          background: "rgba(39,174,96,0.06)",
                        }}
                      />
                      <div
                        style={{
                          fontSize: 9,
                          color: "#27AE60",
                          letterSpacing: 2.5,
                          textTransform: "uppercase",
                          fontFamily: "DM Mono,monospace",
                          marginBottom: 8,
                        }}
                      >
                        YOUR SAVING
                      </div>
                      <div
                        style={{
                          fontFamily: "Cormorant Garamond,serif",
                          fontSize: 36,
                          fontWeight: 700,
                          color: "#27AE60",
                          lineHeight: 1,
                          marginBottom: 6,
                        }}
                      >
                        {fmtAED(discountAmt)}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "rgba(39,174,96,0.7)" }}
                      >
                        {activeDiscount}% off list price of{" "}
                        {fmtAED(
                          activeDiscount < 100
                            ? netPrice / (1 - activeDiscount / 100)
                            : netPrice,
                        )}
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: extraRate ? "1fr 1fr" : "1fr",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 16px",
                        background: "rgba(30,111,217,0.06)",
                        borderRadius: 10,
                        border: "1px solid rgba(30,111,217,0.12)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "#8892AA",
                          letterSpacing: 1.5,
                          fontFamily: "DM Mono,monospace",
                          marginBottom: 4,
                        }}
                      >
                        USD
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#1E6FD9",
                          fontFamily: "DM Mono,monospace",
                        }}
                      >
                        {fmtUSD(priceWithPark, usdRate)}
                      </div>
                      <div
                        style={{ fontSize: 9, color: "#8892AA", marginTop: 2 }}
                      >
                        1 USD = AED 3.65
                      </div>
                    </div>
                    {extraRate && (
                      <div
                        style={{
                          padding: "14px 16px",
                          background: `rgba(${hexRgb(pc)},0.06)`,
                          borderRadius: 10,
                          border: `1px solid rgba(${hexRgb(pc)},0.12)`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "#8892AA",
                            letterSpacing: 1.5,
                            fontFamily: "DM Mono,monospace",
                            marginBottom: 4,
                          }}
                        >
                          {extraCurrency}
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: pc,
                            fontFamily: "DM Mono,monospace",
                          }}
                        >
                          {extraSym}
                          {Math.round(
                            priceWithPark * extraRate,
                          ).toLocaleString()}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "#8892AA",
                            marginTop: 2,
                          }}
                        >
                          1 AED = {extraCurrency} {extraRate.toFixed(3)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        fontSize: 9,
                        color: "#8892AA",
                        letterSpacing: 2.5,
                        textTransform: "uppercase",
                        fontFamily: "DM Mono,monospace",
                        marginBottom: 10,
                      }}
                    >
                      PAYMENT STRUCTURE
                    </div>
                    <PaymentBar
                      plan={plan}
                      netPrice={netPrice}
                      primaryColor={pc}
                      secondaryColor={sc}
                      handoverMonths={hoMonths}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "32px 48px", background: "#F0F4FA" }}>
              <div
                style={{
                  fontSize: 9,
                  color: "#8892AA",
                  letterSpacing: 2.5,
                  textTransform: "uppercase",
                  fontFamily: "DM Mono,monospace",
                  marginBottom: 24,
                }}
              >
                PAYMENT MILESTONES
              </div>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 22,
                    top: 12,
                    bottom: 12,
                    width: 2,
                    background: `linear-gradient(180deg,${pc},rgba(${hexRgb(pc)},0.1))`,
                    borderRadius: 1,
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                >
                  {milestones.map((m, i) => {
                    const dotColor = m.isHandover
                      ? pc
                      : m.isBooking
                        ? "#C9A84C"
                        : m.type === "dp"
                          ? pc
                          : m.type === "installment"
                            ? "#0EA5A0"
                            : pc;
                    const dotSize = m.isHandover ? 16 : m.isBooking ? 14 : 10;
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          paddingBottom: m.isHandover ? 0 : 8,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: 46,
                            display: "flex",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: dotSize,
                              height: dotSize,
                              borderRadius: "50%",
                              background: dotColor,
                              border: "2px solid #fff",
                              boxShadow: `0 0 0 2px ${dotColor}`,
                              flexShrink: 0,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            display: "grid",
                            gridTemplateColumns: "1fr 44px 1fr",
                            gap: "0 12px",
                            alignItems: "center",
                            padding: m.isHandover ? "11px 16px" : "6px 14px",
                            background: m.isHandover
                              ? `rgba(${hexRgb(pc)},0.06)`
                              : m.isBooking
                                ? "rgba(184,134,11,0.04)"
                                : "transparent",
                            borderRadius: m.isHandover ? 8 : 5,
                            border: m.isHandover
                              ? `1px solid rgba(${hexRgb(pc)},0.12)`
                              : "none",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: m.isHandover ? 13 : 12,
                                fontWeight: m.isHandover ? 700 : 500,
                                color: m.isHandover ? pc : "#1A2340",
                              }}
                            >
                              {m.label}
                            </div>
                            {m.date && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#8892AA",
                                  fontFamily: "DM Mono,monospace",
                                  marginTop: 1,
                                }}
                              >
                                {m.date}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: dotColor,
                              fontFamily: "DM Mono,monospace",
                              textAlign: "center",
                            }}
                          >
                            {m.pct.toFixed(2)}%
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontSize: m.isHandover ? 13 : 12,
                                fontWeight: m.isHandover ? 700 : 600,
                                color: m.isHandover ? pc : "#1A2340",
                                fontFamily: "DM Mono,monospace",
                              }}
                            >
                              {fmtAED(m.amount)}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: "#8892AA",
                                fontFamily: "DM Mono,monospace",
                                marginTop: 1,
                              }}
                            >
                              {fmtUSD(m.amount, usdRate)}
                            </div>
                            {extraRate && (
                              <div
                                style={{
                                  fontSize: 9,
                                  color: "#8892AA",
                                  fontFamily: "DM Mono,monospace",
                                }}
                              >
                                {extraSym}
                                {Math.round(
                                  m.amount * extraRate,
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Page 3: Property */}
          <div
            className="op"
            style={{
              background: "#fff",
              position: "relative",
              overflow: "hidden",
              pageBreakAfter: "auto",
              breakAfter: "auto",
            }}
          >
            <WatermarkPreview
              watermark={watermark}
              teamName={settings.teamName as string}
            />
            <div
              style={{
                height: 3,
                background: `linear-gradient(90deg,${pc},${sc})`,
              }}
            />
            {unitType?.virtualTour && (
              <div
                style={{
                  padding: "20px 48px",
                  borderBottom: "1px solid #e8ecf2",
                  background: "#F0F4FA",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "#8892AA",
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    fontFamily: "DM Mono,monospace",
                    marginBottom: 12,
                  }}
                >
                  VIRTUAL TOUR
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(unitType.virtualTour)}`}
                      alt="Virtual Tour QR"
                      style={{
                        width: 120,
                        height: 120,
                        display: "block",
                        borderRadius: 8,
                        border: "1px solid #D0DCF0",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 9,
                        color: "#8892AA",
                        marginTop: 4,
                        fontFamily: "DM Mono,monospace",
                      }}
                    >
                      Scan to explore
                    </div>
                  </div>
                  <div>
                    <a
                      href={unitType.virtualTour}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 24px",
                        background: `linear-gradient(135deg,${pc},${adjustColor(pc, -0.1)})`,
                        borderRadius: 8,
                        textDecoration: "none",
                        boxShadow: `0 4px 16px rgba(${hexRgb(pc)},0.3)`,
                        marginBottom: 10,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Explore Virtual Tour
                    </a>
                    <div
                      style={{
                        fontSize: 9,
                        color: "#8892AA",
                        fontFamily: "DM Mono,monospace",
                        marginTop: 6,
                        maxWidth: 280,
                        wordBreak: "break-all",
                      }}
                    >
                      {unitType.virtualTour}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {fp && (
              <div
                style={{
                  padding: "36px 48px",
                  borderBottom: "1px solid #e8ecf2",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "#8892AA",
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    fontFamily: "DM Mono,monospace",
                    marginBottom: 24,
                  }}
                >
                  FLOOR PLAN
                </div>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      padding: 3,
                      background: `linear-gradient(135deg,${pc},${sc},${pc})`,
                      borderRadius: 12,
                      boxShadow: `0 16px 48px rgba(${hexRgb(pc)},0.2),0 4px 16px rgba(0,0,0,0.08)`,
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 12,
                        padding: 6,
                        position: "relative",
                      }}
                    >
                      {fp.isImage ? (
                        <img
                          src={fp.dataUrl}
                          alt="Floor Plan"
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                            borderRadius: 4,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: 40,
                            textAlign: "center",
                            color: "#8892AA",
                          }}
                        >
                          <div style={{ fontSize: 14 }}>{fp.name}</div>
                          <div style={{ fontSize: 11, marginTop: 4 }}>
                            PDF - renders in production
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      left: 40,
                      background: pc,
                      color: "#fff",
                      padding: "4px 16px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: "DM Mono,monospace",
                      letterSpacing: 1,
                      boxShadow: `0 4px 12px rgba(${hexRgb(pc)},0.4)`,
                    }}
                  >
                    {unitType?.label || ""}
                    {unit.subtype ? ` - ${unit.subtype}` : ""}
                  </div>
                </div>
              </div>
            )}
            {project.masterPlan &&
              (
                project.masterPlan as {
                  name?: string;
                  dataUrl?: string;
                  isImage?: boolean;
                }
              ).dataUrl && (
                <div
                  style={{
                    padding: "36px 48px",
                    borderBottom: "1px solid #e8ecf2",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: "#8892AA",
                      letterSpacing: 2.5,
                      textTransform: "uppercase",
                      fontFamily: "DM Mono,monospace",
                      marginBottom: 24,
                    }}
                  >
                    MASTER PLAN
                  </div>
                  <div
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      boxShadow: `0 20px 60px rgba(${hexRgb(pc)},0.2)`,
                    }}
                  >
                    <div
                      style={{
                        background: `linear-gradient(135deg,${pc},${sc})`,
                        padding: "10px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: "#fff",
                          fontFamily: "DM Mono,monospace",
                          letterSpacing: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        {project.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.6)",
                          fontFamily: "DM Mono,monospace",
                        }}
                      >
                        {project.location}
                      </span>
                    </div>
                    {(
                      project.masterPlan as {
                        isImage?: boolean;
                        dataUrl?: string;
                      }
                    ).isImage ? (
                      <img
                        src={
                          (project.masterPlan as { dataUrl: string }).dataUrl
                        }
                        alt="Master Plan"
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          background: "#F0F4FA",
                          padding: 40,
                          textAlign: "center",
                          color: "#8892AA",
                        }}
                      >
                        <div style={{ fontSize: 14 }}>
                          {(project.masterPlan as { name: string }).name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            {project.whyBuy && (project.whyBuy as string[]).length > 0 && (
              <div
                style={{
                  padding: "20px 48px",
                  background: `rgba(${hexRgb(pc)},0.04)`,
                  borderBottom: "1px solid #e8ecf2",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                    gap: 10,
                  }}
                >
                  {(project.whyBuy as string[]).map((pt, i) => (
                    <div
                      key={i}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: `rgba(${hexRgb(pc)},0.12)`,
                          border: `1px solid rgba(${hexRgb(pc)},0.25)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: pc,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#4A5880",
                          lineHeight: 1.4,
                        }}
                      >
                        {pt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div
              style={{
                padding: "16px 48px",
                background: "#fff",
                borderTop: `2px solid rgba(${hexRgb(pc)},0.15)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#8892AA",
                    maxWidth: 420,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  {project.disclaimer}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {agentName && (
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1A2340",
                      }}
                    >
                      {agentName}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#8892AA", marginTop: 1 }}>
                    {(settings.teamName as string) || "Reportage Properties"}
                  </div>
                  {agentPhone && (
                    <div
                      style={{ fontSize: 10, color: "#8892AA", marginTop: 1 }}
                    >
                      {agentPhone}
                    </div>
                  )}
                  {agentEmail && (
                    <div
                      style={{ fontSize: 10, color: "#8892AA", marginTop: 1 }}
                    >
                      {agentEmail}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComparisonPreview({
  offer,
  settings,
  onClose,
}: {
  offer: Record<string, unknown>;
  settings: Record<string, unknown>;
  onClose: () => void;
}) {
  const project = offer.project as Project;
  const unit = offer.unit as Unit;
  const unitType = offer.unitType as UnitType | null;
  const plans = offer.plans as PaymentPlan[];
  const clientName = offer.clientName as string;
  const agentName = offer.agentName as string;
  const watermark = offer.watermark as string | null;
  const offerDate = offer.offerDate as Date;
  const isEvent = offer.isEvent as boolean;

  const pc = project.primaryColor || "#1A3C6B";

  const comparison = (() => {
    const data: Record<string, string | number>[] = [];
    plans.forEach((p) => {
      const effDisc =
        (isEvent && p.eventDiscount ? p.eventDiscount : p.discount) + 0;
      const netPrice = unit.price * (1 - effDisc / 100);
      const regFee =
        Math.round((netPrice * (project.feePct || 4)) / 100) +
        (project.feeFixed || 2194);
      const utilAmt =
        project.utilityAmount ||
        UTILITY[project.type === "Townhouses" ? "Townhouses" : "Apartments"];
      const parkingAmt = calcParking(project, unitType as UnitType) || 0;
      const finalPrice = Math.round(netPrice) + regFee + utilAmt + parkingAmt;
      data.push({
        label: p.label,
        dp: `${p.dp}%`,
        installment: p.installmentPct > 0 ? `${p.installmentPct}%/mo` : "None",
        duration:
          p.durationType === "fixed_months"
            ? `${p.durationMonths}mo`
            : "Till HO",
        discount: `${effDisc}%`,
        netPrice: fmtAED(netPrice),
        regFee: fmtAED(regFee),
        parking: parkingAmt > 0 ? fmtAED(parkingAmt) : "-",
        total: fmtAED(finalPrice),
      });
    });
    return data;
  })();

  return (
    <div
      id="print-root"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(5,8,20,0.96)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "32px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 960 }}>
        <div
          id="offer-toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              letterSpacing: 2,
              fontFamily: "DM Mono,monospace",
            }}
          >
            COMPARISON PREVIEW
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => window.print(), 100);
              }}
              className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-linear-to-r from-gold to-[#C9A84C]"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="h-[38px] px-4 rounded-[6px] text-sm cursor-pointer text-white border"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                background: "transparent",
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div
          id="offer-doc"
          style={{
            borderRadius: 12,
            overflow: "hidden",
            fontFamily: "Outfit,sans-serif",
            boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
            background: "#fff",
            padding: "32px 40px",
          }}
        >
          <WatermarkPreview
            watermark={watermark}
            teamName={settings.teamName as string}
          />
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <div
              style={{
                fontSize: 9,
                color: "#8892AA",
                letterSpacing: 4,
                fontFamily: "DM Mono,monospace",
                marginBottom: 8,
              }}
            >
              PLAN COMPARISON
            </div>
            <div
              style={{
                fontFamily: "Cormorant Garamond,serif",
                fontSize: 28,
                fontWeight: 600,
                color: "#1A2340",
              }}
            >
              {project.name}
            </div>
            <div style={{ fontSize: 12, color: "#4A5880", marginTop: 4 }}>
              {unit.number} - {unitType?.label || ""} |{" "}
              {fmtDate(offerDate || new Date())}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${pc}` }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      color: "#8892AA",
                      fontWeight: 400,
                      fontFamily: "DM Mono,monospace",
                      fontSize: 10,
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                    }}
                  />
                  {comparison.map((c) => (
                    <th
                      key={c.label as string}
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        color: pc,
                        fontWeight: 600,
                        fontSize: 11,
                        borderLeft: "1px solid #eee",
                      }}
                    >
                      {c.label as string}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  "dp",
                  "installment",
                  "duration",
                  "discount",
                  "netPrice",
                  "regFee",
                  "parking",
                  "total",
                ].map((key) => {
                  const labels: Record<string, string> = {
                    dp: "Down Payment",
                    installment: "Installments",
                    duration: "Duration",
                    discount: "Discount",
                    netPrice: "Net Price",
                    regFee: "Reg. Fee",
                    parking: "Parking",
                    total: "Total",
                  };
                  return (
                    <tr key={key} style={{ borderBottom: "1px solid #eee" }}>
                      <td
                        style={{
                          padding: "10px 16px",
                          color: "#4A5880",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          fontFamily: "DM Mono,monospace",
                          fontSize: 10,
                          letterSpacing: 0.5,
                        }}
                      >
                        {labels[key].toUpperCase()}
                      </td>
                      {comparison.map((c) => (
                        <td
                          key={c.label as string}
                          style={{
                            padding: "10px 16px",
                            textAlign: "center",
                            color:
                              key === "total"
                                ? pc
                                : key === "netPrice" || key === "discount"
                                  ? "#1A8A5A"
                                  : "#1A2340",
                            fontWeight:
                              key === "total" || key === "netPrice" ? 700 : 400,
                            borderLeft: "1px solid #eee",
                          }}
                        >
                          {c[key] as string}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 32,
              padding: "16px 20px",
              background: "#F0F4FA",
              borderRadius: 8,
            }}
          >
            <div
              style={{ fontSize: 10, color: "#8892AA", fontStyle: "italic" }}
            >
              {project.disclaimer}
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #D0DCF0",
              paddingTop: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "#8892AA",
                  fontFamily: "DM Mono,monospace",
                  letterSpacing: 1,
                }}
              >
                PREPARED FOR
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2340" }}>
                {clientName}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2340" }}>
                {agentName}
              </div>
              <div style={{ fontSize: 10, color: "#8892AA" }}>
                {(settings.teamName as string) || "Reportage Properties"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AllPlansPreview({
  offer,
  settings,
  onClose,
}: {
  offer: Record<string, unknown>;
  settings: Record<string, unknown>;
  onClose: () => void;
}) {
  const project = offer.project as Project;
  const clientName = offer.clientName as string;
  const agentName = offer.agentName as string;
  const watermark = offer.watermark as string | null;
  const offerDate = offer.offerDate as Date;
  const offers = offer.offers as Array<{
    plan: PaymentPlan;
    netPrice: number;
    discountAmt: number;
    regFee: number;
    utility: number;
    parking: number;
    schedule: ScheduleRow[];
  }>;

  const pc = project.primaryColor || "#1A3C6B";

  return (
    <div
      id="print-root"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(5,8,20,0.96)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "32px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 820 }}>
        <div
          id="offer-toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              letterSpacing: 2,
              fontFamily: "DM Mono,monospace",
            }}
          >
            ALL PLANS PREVIEW ({offers.length} plans)
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => window.print(), 100);
              }}
              className="h-[38px] px-4 rounded-[6px] text-sm font-semibold cursor-pointer text-white bg-linear-to-r from-gold to-[#C9A84C]"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="h-[38px] px-4 rounded-[6px] text-sm cursor-pointer text-white border"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                background: "transparent",
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div
          id="offer-doc"
          style={{
            borderRadius: 12,
            overflow: "hidden",
            fontFamily: "Outfit,sans-serif",
            boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
          }}
        >
          {offers.map((off, idx) => (
            <div
              key={idx}
              className="op"
              style={{
                background: "#fff",
                position: "relative",
                overflow: "hidden",
                pageBreakAfter: "always",
                breakAfter: "page",
              }}
            >
              <WatermarkPreview
                watermark={watermark}
                teamName={settings.teamName as string}
              />
              <div
                style={{
                  height: 3,
                  background: `linear-gradient(90deg,${pc},#A8C5E8)`,
                }}
              />
              <div
                style={{
                  padding: "20px 48px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#8892AA",
                      letterSpacing: 2,
                      fontFamily: "DM Mono,monospace",
                      marginBottom: 3,
                    }}
                  >
                    PLAN {idx + 1}
                  </div>
                  <div
                    style={{
                      fontFamily: "Cormorant Garamond,serif",
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#1A2340",
                    }}
                  >
                    {off.plan.label}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#8892AA",
                      fontFamily: "DM Mono,monospace",
                      letterSpacing: 1,
                    }}
                  >
                    {fmtDate(offerDate || new Date())}
                  </div>
                </div>
              </div>

              <div style={{ padding: "0 48px 24px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  <div className="inline-flex items-center rounded px-2.5 py-1 text-[10px] font-mono border bg-green-dim text-green border-[rgba(26,138,90,0.3)]">
                    {off.plan.discount}% OFF
                  </div>
                  <div className="inline-flex items-center rounded px-2.5 py-1 text-[10px] font-mono border bg-blue-dim text-blue border-[rgba(30,111,217,0.3)]">
                    {off.plan.dp}% DP
                  </div>
                  {off.plan.installmentPct > 0 && (
                    <div className="inline-flex items-center rounded px-2.5 py-1 text-[10px] font-mono border bg-orange-dim text-orange border-[rgba(200,100,10,0.3)]">
                      {off.plan.installmentPct}%/mo
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 9,
                    color: "#8892AA",
                    letterSpacing: 2.5,
                    fontFamily: "DM Mono,monospace",
                    marginBottom: 12,
                  }}
                >
                  INVESTMENT SUMMARY
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      padding: "16px",
                      background: "#F0F4FA",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 10, color: "#8892AA" }}>
                      NET PRICE
                    </div>
                    <div
                      style={{
                        fontFamily: "Cormorant Garamond,serif",
                        fontSize: 28,
                        fontWeight: 700,
                        color: pc,
                      }}
                    >
                      {fmtAED(off.netPrice)}
                    </div>
                    <div
                      style={{ fontSize: 9, color: "#8892AA", marginTop: 2 }}
                    >
                      LIST:{" "}
                      {fmtAED(
                        off.netPrice / (1 - (off.plan.discount || 0) / 100),
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "16px",
                      background: "rgba(39,174,96,0.06)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 10, color: "#8892AA" }}>
                      YOUR SAVING
                    </div>
                    <div
                      style={{
                        fontFamily: "Cormorant Garamond,serif",
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#27AE60",
                      }}
                    >
                      {fmtAED(off.discountAmt)}
                    </div>
                    <div
                      style={{ fontSize: 9, color: "#8892AA", marginTop: 2 }}
                    >
                      {off.plan.discount}% discount
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#F0F4FA",
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "#8892AA",
                        fontFamily: "DM Mono,monospace",
                      }}
                    >
                      REG FEE
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1A2340",
                        fontFamily: "DM Mono,monospace",
                      }}
                    >
                      {fmtAED(off.regFee)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#F0F4FA",
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "#8892AA",
                        fontFamily: "DM Mono,monospace",
                      }}
                    >
                      UTILITY
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1A2340",
                        fontFamily: "DM Mono,monospace",
                      }}
                    >
                      {fmtAED(off.utility)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#F0F4FA",
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "#8892AA",
                        fontFamily: "DM Mono,monospace",
                      }}
                    >
                      PARKING
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1A2340",
                        fontFamily: "DM Mono,monospace",
                      }}
                    >
                      {off.parking > 0 ? fmtAED(off.parking) : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {off.schedule && off.schedule.length > 0 && (
                <div style={{ padding: "0 48px 32px" }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#8892AA",
                      letterSpacing: 2.5,
                      fontFamily: "DM Mono,monospace",
                      marginBottom: 12,
                    }}
                  >
                    SCHEDULE ({off.schedule.length} payments)
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #D0DCF0" }}>
                        {["#", "Milestone", "Amount"].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "8px 12px",
                              textAlign: "left",
                              fontSize: 10,
                              color: "#8892AA",
                              fontFamily: "DM Mono,monospace",
                              letterSpacing: 1,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {off.schedule.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: 11,
                              color: "#8892AA",
                              fontFamily: "DM Mono,monospace",
                            }}
                          >
                            {i + 1}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: 12,
                              color: "#1A2340",
                            }}
                          >
                            {r.label}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#1A2340",
                              fontFamily: "DM Mono,monospace",
                            }}
                          >
                            {fmtAED(r.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div
                style={{
                  padding: "16px 48px",
                  borderTop: "1px solid #D0DCF0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#8892AA",
                      fontFamily: "DM Mono,monospace",
                      letterSpacing: 1,
                    }}
                  >
                    PREPARED FOR
                  </div>
                  <div
                    style={{
                      fontFamily: "Cormorant Garamond,serif",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#1A2340",
                    }}
                  >
                    {clientName}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: "#1A2340" }}
                  >
                    {agentName}
                  </div>
                  <div style={{ fontSize: 10, color: "#8892AA" }}>
                    {(settings.teamName as string) || "Reportage Properties"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WatermarkPreview({
  watermark,
  teamName,
}: {
  watermark: string | null;
  teamName: string;
}) {
  if (!watermark && !teamName) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "40%",
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: 0.04,
        fontSize: 36,
        fontWeight: 700,
        color: "#1A2340",
        fontFamily: "Cormorant Garamond,serif",
        letterSpacing: 6,
        transform: "rotate(-30deg)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {watermark &&
      (watermark.startsWith("data:") || watermark.startsWith("http")) ? (
        <img
          src={watermark}
          alt=""
          style={{ width: 160, opacity: 0.3, margin: "0 auto" }}
        />
      ) : (
        watermark || teamName || ""
      )}
    </div>
  );
}

function hexRgb(hex: string): string {
  const c = hex.replace("#", "");
  return `${parseInt(c.substring(0, 2), 16)},${parseInt(c.substring(2, 4), 16)},${parseInt(c.substring(4, 6), 16)}`;
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * amount)));
  const g = Math.min(
    255,
    Math.max(0, ((num >> 8) & 0x00ff) + Math.round(255 * amount)),
  );
  const b = Math.min(
    255,
    Math.max(0, (num & 0x0000ff) + Math.round(255 * amount)),
  );
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function ServerPdfPreview({
  base64,
  offerData,
  template,
  fileName,
  onClose,
}: {
  base64: string;
  offerData: any;
  template: "single-offer" | "comparison" | "all-plans";
  fileName: string;
  onClose: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error("Error creating blob from base64:", e);
    }
  }, [base64]);

  const handleDownload = async () => {
    toast.loading("Downloading PDF...", { id: "pdf-dl" });
    try {
      const response = await apiClient.post(
        "pdf/generate",
        {
          template,
          format: "A4",
          offerData,
        },
        {
          responseType: "blob",
          headers: {
            Accept: "application/pdf",
          },
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Downloaded successfully!", { id: "pdf-dl" });
    } catch (err) {
      console.error("Failed to download PDF:", err);
      toast.error("Failed to download PDF", { id: "pdf-dl" });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(5,8,20,0.96)",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      className="p-0 sm:p-5"
    >
      <div
        style={{
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        className="w-full sm:max-w-[1200px] h-full sm:h-[95vh] sm:rounded-[12px] rounded-none shadow-2xl"
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            background: "#1A2340",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#fff",
          }}
        >
          <div className="font-serif text-lg font-semibold">
            Offer PDF Preview
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleDownload}
              className="h-[36px] px-4 rounded-[6px] text-xs font-bold cursor-pointer text-white bg-green hover:bg-[#146b45] border-none"
            >
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="h-[36px] px-4 rounded-[6px] text-xs font-semibold cursor-pointer text-white border"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                background: "transparent",
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: "12px",
            background: "#F0F4FA",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
          className="flex flex-col gap-2"
        >
          {blobUrl && (
            <div className="block sm:hidden text-center p-2 bg-[#E8F0FE] rounded-[6px] border border-[#BDD1EB]">
              <span className="text-[12px] text-navy font-semibold">
                On mobile? If PDF doesn't load/scroll, click{" "}
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue underline font-bold animate-pulse"
                >
                  Open PDF in new tab
                </a>
              </span>
            </div>
          )}
          {blobUrl ? (
            <iframe
              src={blobUrl}
              width="100%"
              height="100%"
              style={{ border: "none", borderRadius: "6px", flex: 1 }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-navy-dim text-[13px] font-mono animate-pulse">
              Loading preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
