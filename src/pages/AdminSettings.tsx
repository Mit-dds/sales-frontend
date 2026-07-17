import { useState, useEffect } from "react";
import { toast } from "sonner";
import { settingsService } from "@/services/settings.service";
import { apiClient } from "@/lib/api/apiClient";
import type { Settings } from "@/types";

const CURRENCIES: [keyof Settings, string][] = [
  ["usdRate", "USD"],
  ["eurRate", "EUR"],
  ["gbpRate", "GBP"],
  ["inrRate", "INR"],
  ["rubRate", "RUB"],
  ["audRate", "AUD"],
  ["cadRate", "CAD"],
  ["sarRate", "SAR"],
  ["pkrRate", "PKR"],
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    settingsService.get(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchSettings = async () => {
      setLoading(true);
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
            usdRate: rates.USD ?? data.usdRate ?? currentSettings.usdRate ?? 0.272,
            eurRate: rates.EUR ?? data.eurRate ?? currentSettings.eurRate ?? 0.25,
            gbpRate: rates.GBP ?? data.gbpRate ?? currentSettings.gbpRate ?? 0.214,
            inrRate: rates.INR ?? data.inrRate ?? currentSettings.inrRate ?? 22.5,
            rubRate: rates.RUB ?? data.rubRate ?? currentSettings.rubRate ?? 24.8,
            audRate: rates.AUD ?? data.audRate ?? currentSettings.audRate ?? 0.421,
            cadRate: rates.CAD ?? data.cadRate ?? currentSettings.cadRate ?? 0.371,
            sarRate: rates.SAR ?? data.sarRate ?? currentSettings.sarRate ?? 1.02,
            pkrRate: rates.PKR ?? data.pkrRate ?? currentSettings.pkrRate ?? 75.6,
          };
          setSettings(mergedSettings);
          settingsService.update(mergedSettings);
        }
      } catch (err) {
        console.error("Failed to fetch settings from API:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: Settings;
      }>("settings", settings);
      if (response.data?.success) {
        settingsService.update(settings);
        toast.success("Settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const rate = (key: keyof Settings) => (settings[key] as number) || 0;
  const f = (n: number) => Math.round(n).toLocaleString();
  const base = 1000000;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-navy mb-6">
        Settings
      </h1>

      <div className="bg-white border border-border rounded-[10px] p-6 mb-5 shadow-[0_2px_8px_rgba(30,60,120,0.06)]">
        <div className="text-[10px] text-navy-light tracking-[1.5px] font-mono mb-3">
          TEAM
        </div>
        <div>
          <div className="text-[10px] text-navy-light tracking-[1.6px] uppercase font-mono mb-1.5">
            Team Name
          </div>
          <input
            className="w-full bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none"
            value={settings.teamName}
            onChange={(e) => update("teamName", e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-border rounded-[10px] p-6 shadow-[0_2px_8px_rgba(30,60,120,0.06)]">
        <div className="text-[10px] text-navy-light tracking-[1.5px] font-mono mb-1.5">
          EXCHANGE RATES
        </div>
        <div className="text-[12px] text-navy-dim mb-4">
          Enter how much 1 AED equals in each currency.
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
          {CURRENCIES.map(([key, label]) => (
            <div key={key}>
              <div className="text-[10px] text-navy-light tracking-[1.6px] uppercase font-mono mb-1.5">
                {label}
              </div>
              <input
                className="w-full bg-[#F8FAFF] border border-border rounded-md text-navy px-3.5 py-2.5 text-[13px] outline-none"
                type="number"
                step="0.001"
                value={rate(key) || ""}
                onChange={(e) =>
                  update(key, +e.target.value as Settings[keyof Settings])
                }
                placeholder="0.000"
              />
            </div>
          ))}
        </div>
        <div className="px-3.5 py-2.5 bg-blue-dim rounded-md text-[12px] text-navy-light">
          1M AED = USD {f(base * rate("usdRate") || base * 0.272)} GBP{" "}
          {f(base * rate("gbpRate") || base * 0.214)} INR{" "}
          {f(base * rate("inrRate") || base * 22.5)}
        </div>
      </div>

      <div className="mt-5">
        <button
          className="bg-linear-to-br from-[#C9A84C] to-[#E4C97A] text-navy border-none rounded-[6px] px-6 py-2.5 text-[13px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
