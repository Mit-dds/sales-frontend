import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiClient } from "@/lib/api/apiClient";
import { fmtAED } from "@/domain/currency";
import { Avatar } from "@/components/ui";

type Offer = {
  id: string;
  date: string;
  agentId: string;
  agentName: string;
  clientName: string;
  clientPhone: string | null;
  projectName: string;
  unitNumber: string;
  unitType: string;
  planLabel: string;
  offerMode: string;
  discount: number;
  netPrice: number;
  type: string;
  action: string;
};

type Stats = {
  totalOffers: number;
  thisMonth: number;
  singleOffers: number;
  multiPlan: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiResponse = {
  success: boolean;
  data: {
    offers: Offer[];
    pagination: Pagination;
    stats: Stats;
  };
};

type FilterState = {
  agent: string;
  project: string;
  search: string;
};

export default function OfferHistory() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterState>({
    agent: "",
    project: "",
    search: "",
  });
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOffers: 0, thisMonth: 0, singleOffers: 0, multiPlan: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";

  const fetchOffers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 20,
        sortBy: "createdAt",
        sortDir: "desc",
      };
      if (filter.search) params.search = filter.search;
      if (isAdmin && filter.agent) params.agentName = filter.agent;
      if (filter.project) params.projectId = filter.project;

      const res = await apiClient.get<ApiResponse>("offers", { params });

      if (res.data?.success) {
        setOffers(res.data.data.offers);
        setStats(res.data.data.stats);
        setPagination(res.data.data.pagination);
      }
    } catch {
      console.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  }, [user, page, filter.search, filter.agent, filter.project, isAdmin]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filter.search, filter.agent, filter.project]);

  if (!user) return null;

  const agents = Array.from(new Set(offers.map((h) => h.agentName)));
  const projectNames = Array.from(new Set(offers.map((h) => h.projectName)));

  const statCards: [string, number, string][] = [
    ["Total Offers", stats.totalOffers, "#B8860B"],
    ["This Month", stats.thisMonth, "#1A8A5A"],
    ["Single Offers", stats.singleOffers, "#1E6FD9"],
    ["Multi-Plan", stats.multiPlan, "#C8640A"],
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl text-navy font-semibold mb-6">
        {isAdmin ? "Offer History" : "My Offers"}
      </h1>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 mb-6">
        {statCards.map(([label, value, color]) => (
          <div
            key={label}
            className="bg-white border border-border rounded-[10px] p-4 text-center shadow-[0_2px_8px_rgba(30,60,120,0.06)]"
            style={{ borderTop: `3px solid ${color}` }}
          >
            <div
              className="text-2xl font-bold font-serif"
              style={{ color, fontFamily: "Cormorant Garamond, serif" }}
            >
              {value}
            </div>
            <div className="text-[10px] text-navy-dim font-sans tracking-[1px] mt-1 uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          className="flex-1 min-w-[180px] bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none"
          placeholder="Search client or unit..."
          value={filter.search}
          onChange={(e) =>
            setFilter((p) => ({ ...p, search: e.target.value }))
          }
        />
        {isAdmin && (
          <select
            className="flex-1 min-w-[140px] bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none cursor-pointer"
            value={filter.agent}
            onChange={(e) =>
              setFilter((p) => ({ ...p, agent: e.target.value }))
            }
          >
            <option value="">All Agents</option>
            {agents.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        )}
        <select
          className="flex-1 min-w-[160px] bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none cursor-pointer"
          value={filter.project}
          onChange={(e) =>
            setFilter((p) => ({ ...p, project: e.target.value }))
          }
        >
          <option value="">All Projects</option>
          {projectNames.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        {(filter.agent || filter.project || filter.search) && (
          <button
            className="bg-transparent text-navy-light border border-border rounded-md px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-gold-dim"
            onClick={() =>
              setFilter({ agent: "", project: "", search: "" })
            }
          >
            Clear
          </button>
        )}
      </div>

      {loading && offers.length === 0 ? (
        <div className="bg-white border border-border rounded-[10px] p-12 text-center shadow-[0_2px_8px_rgba(30,60,120,0.06)] border-dashed border-border">
          <div className="font-serif text-[22px] text-navy mb-2">
            Loading offers...
          </div>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white border border-border rounded-[10px] p-12 text-center shadow-[0_2px_8px_rgba(30,60,120,0.06)] border-dashed border-border">
          <div className="font-serif text-[22px] text-navy mb-2">
            {stats.totalOffers === 0
              ? "No offers generated yet"
              : "No matching offers"}
          </div>
          <div className="text-[13px] text-navy-dim">
            {stats.totalOffers === 0
              ? "Every offer you generate will appear here."
              : "Try clearing your filters."}
          </div>
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] flex items-center justify-center z-10 rounded-[10px]">
              <div className="bg-navy text-white border border-border rounded-md px-4 py-2 text-[12px] font-semibold tracking-wide uppercase shadow-lg">
                Updating...
              </div>
            </div>
          )}
          <div className={`bg-white border border-border rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(30,60,120,0.06)] transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface">
                    {isAdmin && (
                      <th className="px-3 py-[9px] text-left text-[10px] text-navy-light font-sans tracking-[1.4px] uppercase border-b-2 border-border">
                        Agent
                      </th>
                    )}
                    <th className="px-3 py-[9px] text-left text-[10px] text-navy-light font-sans tracking-[1.4px] uppercase border-b-2 border-border">
                      Date
                    </th>
                    <th className="px-3 py-[9px] text-left text-[10px] text-navy-light font-sans tracking-[1.4px] uppercase border-b-2 border-border">
                      Client
                    </th>
                    <th className="px-3 py-[9px] text-left text-[10px] text-navy-light font-sans tracking-[1.4px] uppercase border-b-2 border-border">
                      Project
                    </th>
                    <th className="px-3 py-[9px] text-left text-[10px] text-navy-light font-sans tracking-[1.4px] uppercase border-b-2 border-border">
                      Unit
                    </th>
                    <th className="px-3 py-[9px] text-left text-[10px] text-navy-light font-sans tracking-[1.4px] uppercase border-b-2 border-border">
                      Plan
                    </th>
                    <th className="px-3 py-[9px] text-left text-[10px] text-navy-light font-sans tracking-[1.4px] uppercase border-b-2 border-border">
                      Net Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-border last:border-b-0"
                    >
                      {isAdmin && (
                        <td className="px-3 py-[11px] text-[13px] text-navy">
                          <div className="flex items-center gap-2">
                            <Avatar name={h.agentName} size={28} />
                            <span className="text-[12px]">{h.agentName}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-[11px] text-[11px] text-navy-light font-sans whitespace-nowrap">
                        {new Date(h.date).toLocaleDateString("en-AE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] text-navy">
                        <div className="font-medium">{h.clientName}</div>
                        {h.clientPhone && (
                          <div className="text-[11px] text-navy-dim">
                            {h.clientPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] text-navy">
                        {h.projectName}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] text-gold font-sans">
                        {h.unitNumber}
                      </td>
                      <td className="px-3 py-[11px] text-[12px] text-navy-light">
                        {h.planLabel}
                      </td>
                      <td className="px-3 py-[11px] text-[13px] text-green font-semibold">
                        {h.netPrice ? fmtAED(h.netPrice) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-[12px] text-navy-dim">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} offers
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-[12px] font-medium rounded border border-border bg-white text-navy-light cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-[12px] font-sans text-navy">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-[12px] font-medium rounded border border-border bg-white text-navy-light cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
