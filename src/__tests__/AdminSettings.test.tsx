import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminSettings from "@/pages/AdminSettings";
import { settingsService } from "@/services/settings.service";
import { apiClient } from "@/lib/api/apiClient";
import { toast } from "sonner";

// Mock services & providers
vi.mock("@/services/settings.service", () => ({
  settingsService: {
    get: vi.fn().mockReturnValue({
      teamName: "Old Team Name",
      usdRate: 0.272,
      eurRate: 0.25,
      gbpRate: 0.214,
    }),
    update: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("AdminSettings Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default settings response
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          teamName: "Reportage Sales Team",
          usdRate: 0.272,
          eurRate: 0.25,
          gbpRate: 0.214,
        },
      },
    });

    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        success: true,
      },
    });
  });

  it("fetches settings on mount and populates the forms", async () => {
    render(<AdminSettings />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("settings");
      expect(screen.getByDisplayValue("Reportage Sales Team")).toBeInTheDocument();
      expect(screen.getByDisplayValue("0.272")).toBeInTheDocument();
    });
  });

  it("updates state when inputs are changed and triggers save API put request", async () => {
    render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Reportage Sales Team")).toBeInTheDocument();
    });

    // Modify Team Name
    const teamInput = screen.getByDisplayValue("Reportage Sales Team");
    fireEvent.change(teamInput, { target: { value: "New Premium Team" } });

    // Save Settings
    const saveBtn = screen.getByRole("button", { name: "Save Settings" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("settings", expect.objectContaining({
        teamName: "New Premium Team",
        usdRate: 0.272,
      }));
      expect(settingsService.update).toHaveBeenCalledWith(expect.objectContaining({
        teamName: "New Premium Team",
        usdRate: 0.272,
      }));
      expect(toast.success).toHaveBeenCalledWith("Settings saved successfully");
    });
  });
});
