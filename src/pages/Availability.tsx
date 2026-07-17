import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Card, ConfirmDialog } from "@/components/ui";
import { apiClient } from "@/lib/api/apiClient";
import { fmtAED } from "@/domain/currency";
import { useAvailabilityStore } from "@/lib/store/useAvailabilityStore";

const CARD_COLORS = [
  "#1A8A5A",
  "#8B4513",
  "#1E6FD9",
  "#B8860B",
  "#C0392B",
  "#6C5CE7",
];

export default function Availability() {
  const [drag, setDrag] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<{
    message: string;
    detail: string;
    onConfirm: () => void;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { projects, parseResult, setImportData, clearImportData } =
    useAvailabilityStore();

  const totalUnits = projects.reduce((s, p) => s + (p.units?.length || 0), 0);

  const parseExcel = useCallback(
    async (file: File) => {
      setParsing(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await apiClient.post<{
          success: boolean;
          data: {
            projects: Array<{
              projectId: string;
              projectName: string;
              unitCount: number;
              units: Array<{
                id: string;
                number: string;
                type: string;
                subtype?: string;
                floor: string | number;
                internal: number;
                external: number;
                total: number;
                price: number;
              }>;
            }>;
            summary: {
              totalImported: number;
              totalSkipped: number;
            };
          };
        }>("availability/import", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data.success) {
          const importData = response.data.data;
          setImportData(
            importData.projects || [],
            importData.summary || { totalImported: 0, totalSkipped: 0 },
            file.name,
          );

          toast.success(
            `${importData.summary?.totalImported || 0} units imported from ${file.name}`,
          );
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to import availability file";
        toast.error(msg);
      } finally {
        setParsing(false);
      }
    },
    [setImportData],
  );

  const handleFiles = useCallback(
    (files: FileList) => {
      const f = Array.from(files).find((f) => f.name.match(/\.xlsx?$/i));
      if (!f) {
        toast.error("Please upload a .xlsx or .xls file");
        return;
      }
      setConfirmMsg({
        message: "Replace all availability?",
        detail: `This replaces ALL units across ALL projects with data from ${f.name}`,
        onConfirm: () => {
          setConfirmMsg(null);
          parseExcel(f);
        },
      });
    },
    [parseExcel],
  );

  const handleClearAll = () => {
    setConfirmMsg({
      message: "Clear all availability data?",
      detail: "This removes all imported units from the application.",
      onConfirm: async () => {
        setConfirmMsg(null);
        const loadingId = toast.loading("Clearing all availability data...");
        try {
          const res = await apiClient.delete<{
            success: boolean;
            message: string;
          }>("availability");
          toast.dismiss(loadingId);
          if (res.data.success) {
            clearImportData();
            toast.success(res.data.message || "All availability data cleared");
          }
        } catch (err: any) {
          toast.dismiss(loadingId);
          const msg =
            err.response?.data?.message ||
            err.message ||
            "Failed to clear availability data";
          toast.error(msg);
        }
      },
    });
  };

  return (
    <div>
      <ConfirmDialog
        open={!!confirmMsg}
        onClose={() => setConfirmMsg(null)}
        onConfirm={() => confirmMsg?.onConfirm()}
        title="Replace Availability"
        message={confirmMsg?.message || ""}
        detail={confirmMsg?.detail}
        confirmLabel="Yes"
        confirmColor="danger"
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif font-semibold text-[26px] text-navy">
          Availability Management
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-[14px_20px] rounded-[10px] border border-border mb-4 bg-white gap-3">
        <div className="flex gap-3 items-center flex-wrap">
          <span
            className={`inline-flex items-center rounded px-2.5 py-1 text-[11px] font-mono border ${
              totalUnits > 0
                ? "bg-green-dim text-green border-[rgba(26,138,90,0.3)]"
                : "bg-red-dim text-red border-[rgba(192,57,43,0.3)]"
            }`}
          >
            {totalUnits} total units loaded
          </span>
          {projects.map((p) => (
            <span
              key={p.projectId}
              className="inline-flex items-center rounded px-2.5 py-1 text-[10px] font-mono border bg-[rgba(30,111,217,0.05)] text-blue border-[rgba(30,111,217,0.25)]"
            >
              {p.projectName}: {(p.units || []).length}
            </span>
          ))}
        </div>
        {totalUnits > 0 && (
          <button
            onClick={handleClearAll}
            className="h-[30px] px-3.5 rounded-[6px] text-xs font-semibold cursor-pointer border border-[#F5C2C2] text-red bg-white hover:bg-[#FFF5F5] transition-colors self-end sm:self-auto shrink-0"
          >
            Clear All
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className="rounded-[12px] p-[48px_24px] text-center cursor-pointer border-2 border-dashed transition-colors bg-[#F8FAFF]"
        style={{
          borderColor: drag ? "#B8860B" : "#BDD1EB",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
        <div className="text-[40px] text-navy mb-3">XLS</div>
        <div className="font-serif text-[22px] text-navy mb-2">
          {parsing ? "Processing..." : "Drop Master Availability File Here"}
        </div>
        <div className="text-[13px] text-navy-dim mb-3">
          or click to browse - .xlsx / .xls
        </div>
        <div className="inline-flex gap-2 flex-wrap justify-center">
          <span className="inline-flex items-center rounded px-2.5 py-1 text-[11px] font-mono border bg-[rgba(201,168,76,0.05)] text-gold border-[rgba(201,168,76,0.3)]">
            All cities in one file
          </span>
          <span className="inline-flex items-center rounded px-2.5 py-1 text-[11px] font-mono border bg-[rgba(30,111,217,0.05)] text-blue border-[rgba(30,111,217,0.3)]">
            Dubai, Abu Dhabi, BRABUS, any city
          </span>
          <span className="inline-flex items-center rounded px-2.5 py-1 text-[11px] font-mono border bg-[rgba(200,100,10,0.05)] text-orange border-[rgba(200,100,10,0.3)]">
            Replaces all existing data
          </span>
        </div>
      </div>

      {parseResult && (
        <Card
          padding="p-5"
          className="mt-4"
          style={{
            border: `1px solid ${parseResult.result.errors.length > 0 && parseResult.result.added === 0 ? "rgba(192,57,43,0.3)" : "rgba(26,138,90,0.3)"}`,
            background:
              parseResult.result.errors.length > 0 &&
              parseResult.result.added === 0
                ? "rgba(192,57,43,0.04)"
                : "rgba(26,138,90,0.04)",
          }}
        >
          <div className="text-[10px] font-mono text-navy-light tracking-[1.5px] mb-3">
            UPLOAD RESULT - {parseResult.filename}
          </div>
          <div className="flex gap-6 mb-3 flex-wrap">
            <div>
              <div className="text-[9px] font-mono text-navy-dim">
                UNITS LOADED
              </div>
              <div className="text-[28px] font-bold text-green">
                {parseResult.result.added}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-navy-dim">SKIPPED</div>
              <div className="text-[28px] font-bold text-navy-light">
                {parseResult.result.skipped}
              </div>
            </div>
            {parseResult.result.errors.length > 0 && (
              <div>
                <div className="text-[9px] font-mono text-navy-dim">
                  WARNINGS
                </div>
                <div className="text-[28px] font-bold text-orange">
                  {parseResult.result.errors.length}
                </div>
              </div>
            )}
          </div>
          {Object.keys(parseResult.result.byCity).length > 0 && (
            <div className="flex gap-2.5 flex-wrap mb-3">
              {Object.entries(parseResult.result.byCity).map(
                ([city, count]) => (
                  <div
                    key={city}
                    className="px-3 py-1.5 rounded-[6px] border border-border"
                    style={{ background: "#fff" }}
                  >
                    <div className="text-[10px] font-mono text-navy-dim">
                      {city.toUpperCase()}
                    </div>
                    <div className="text-[14px] font-bold text-blue">
                      {count} units
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
          {parseResult.result.errors.slice(0, 5).map((e, i) => (
            <div
              key={i}
              className="text-[11px] text-orange py-[3px]"
              style={{ borderTop: "1px solid rgba(200,100,10,0.15)" }}
            >
              {e}
            </div>
          ))}
        </Card>
      )}

      {projects.map((p, idx) => {
        const color = CARD_COLORS[idx % CARD_COLORS.length];
        const units = p.units || [];
        const headers = [
          "UNIT",
          "TYPE",
          "FLOOR",
          "INTERNAL",
          "EXTERNAL",
          "TOTAL",
          "PRICE",
        ];
        return (
          <div
            key={p.projectId}
            className="mt-6 bg-white rounded-[10px] overflow-hidden"
            style={{
              border: "1px solid #D0DCF0",
              borderTop: `3px solid ${color}`,
              boxShadow: "0 2px 8px rgba(30,60,120,0.06)",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "16px 20px" }}
            >
              <div className="font-serif text-[18px] font-normal text-navy">
                {p.projectName}
              </div>
              <span
                style={{
                  background: "rgba(30,111,217,0.08)",
                  color: "#1E6FD9",
                  border: "1px solid rgba(30,111,217,0.3)",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontFamily: "DM Mono,monospace",
                }}
              >
                {units.length} units
              </span>
            </div>
            <div
              className="overflow-x-auto"
              style={{ padding: "0 20px 20px 20px" }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "9px 12px",
                          fontSize: 10,
                          color: "#4A5880",
                          letterSpacing: 1.4,
                          textTransform: "uppercase",
                          fontFamily: "DM Mono,monospace",
                          borderBottom: "2px solid #D0DCF0",
                          background: "#F0F4FA",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const typeText =
                      u.type + (u.subtype ? ` - ${u.subtype}` : "");
                    return (
                      <tr key={u.id}>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 13,
                            color: color,
                            borderBottom: "1px solid #D0DCF0",
                            fontWeight: 500,
                          }}
                        >
                          {u.number}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 13,
                            color: "#1A2340",
                            borderBottom: "1px solid #D0DCF0",
                          }}
                        >
                          {typeText}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 13,
                            color: "#1A2340",
                            borderBottom: "1px solid #D0DCF0",
                          }}
                        >
                          {u.floor || "G"}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 13,
                            color: "#1A2340",
                            borderBottom: "1px solid #D0DCF0",
                          }}
                        >
                          {(u.internal || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 13,
                            color: "#1A2340",
                            borderBottom: "1px solid #D0DCF0",
                          }}
                        >
                          {(u.external || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 13,
                            color: "#1A2340",
                            borderBottom: "1px solid #D0DCF0",
                          }}
                        >
                          {(u.total || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 13,
                            color: "#1A2340",
                            borderBottom: "1px solid #D0DCF0",
                            fontWeight: 700,
                          }}
                        >
                          {fmtAED(u.price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
