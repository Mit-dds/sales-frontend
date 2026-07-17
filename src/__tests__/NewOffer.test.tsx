import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import NewOffer from "@/pages/NewOffer";
import { apiClient } from "@/lib/api/apiClient";

// Mock providers and services
vi.mock("@/app/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "agent_1",
      name: "Sarah Agent",
      phone: "+971 50 123 4567",
      email: "sarah@example.com",
      role: "agent",
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("NewOffer Wizard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock URL.createObjectURL and revokeObjectURL for JSDOM compatibility
    if (typeof window.URL.createObjectURL === "undefined") {
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-pdf-url");
    }
    if (typeof window.URL.revokeObjectURL === "undefined") {
      window.URL.revokeObjectURL = vi.fn();
    }

    // Default settings response
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes("settings")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              teamName: "Sales Team",
              fxRates: { rates: { USD: 0.272 } },
            },
          },
        } as any);
      }
      if (url.includes("availability/projects")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              projects: [
                {
                  id: "proj_123",
                  name: "Taormina Village",
                  location: "Dubai",
                  type: "Townhouses",
                  completionDate: "Q4 2026",
                  unitCount: 12,
                },
              ],
            },
          },
        } as any);
      }
      if (url.match(/projects\/proj_123$/)) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              project: {
                id: "proj_123",
                name: "Taormina Village",
                primaryColor: "#1A3C6B",
                secondaryColor: "#A8C5E8",
                feeLabel: "Oqood",
                feePct: 4,
                bookingToken: 20000,
                day7Payment: 30000,
                utilityAmount: 0,
                parkingCost: 0,
                disclaimer: "Disclaimer info",
              },
            },
          },
        } as any);
      }
      if (url.includes("units") && url.includes("payment-plans")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              unitId: "unit_456",
              unitNumber: "RH-06-10",
              projectName: "Taormina Village",
              paymentPlans: [
                {
                  id: "plan_789",
                  label: "10% DP + 1% Monthly",
                  dp: 10,
                  installmentPct: 1,
                  onHandover: 0,
                  durationType: "till_handover",
                  discount: 5,
                  planType: "normal",
                  eventName: null,
                },
              ],
            },
          },
        } as any);
      }
      if (url.includes("availability/proj_123/units")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              units: [
                {
                  id: "unit_456",
                  number: "RH-06-10",
                  type: "3BR",
                  floor: "G+1",
                  price: 1500000,
                  internal: 2200,
                  external: 600,
                  total: 2800,
                  status: "Available",
                },
              ],
            },
          },
        } as any);
      }
      return Promise.resolve({ data: { success: true, data: {} } } as any);
    });

    // Return a valid base64 string to avoid atob InvalidCharacterError warnings
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: "JVBERi0xLjQKJVRlc3Q=",
      },
    });
  });

  it("loads and displays project list on mount", async () => {
    render(<NewOffer />);
    
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("availability/projects");
      expect(screen.getByText("Taormina Village")).toBeInTheDocument();
      expect(screen.getByText("Dubai • Townhouses")).toBeInTheDocument();
    });
  });

  it("transitions between wizard steps and creates preview offer PDF correctly", async () => {
    render(<NewOffer />);

    // Step 1: Select Project
    await waitFor(() => {
      expect(screen.getByText("Taormina Village")).toBeInTheDocument();
    });

    const projectCard = screen.getByText("Taormina Village");
    fireEvent.click(projectCard);

    // Verify loading details call
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("projects/proj_123");
    });

    // Step 2: Select Unit
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("proj_123/units"),
        expect.any(Object)
      );
    });

    // Renders units list summary grid
    expect(screen.getByText("RH-06-10")).toBeInTheDocument();

    // Select the unit RH-06-10
    const unitRow = screen.getByText("RH-06-10");
    fireEvent.click(unitRow);

    // Step 3: Select Payment Plan
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("payment-plans")
      );
    });

    // Select plan
    await waitFor(() => {
      expect(screen.getByText("10% DP + 1% Monthly")).toBeInTheDocument();
    });

    const planRow = screen.getByText("10% DP + 1% Monthly");
    fireEvent.click(planRow);

    // Click Continue to proceed to Step 4 (Client Info & Preview PDF)
    const continueBtn = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueBtn);

    // Step 4: Enter Client details and Generate PDF
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter client full name...")).toBeInTheDocument();
    });

    // Enter client info
    fireEvent.change(screen.getByPlaceholderText("Enter client full name..."), {
      target: { value: "John Client" },
    });
    fireEvent.change(screen.getByPlaceholderText("971501234567..."), {
      target: { value: "971509999999" },
    });

    // Click on Generate Offer PDF (Preview Mode API call)
    const pdfBtn = screen.getByRole("button", { name: "Generate Offer PDF" });
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "pdf/preview",
        expect.objectContaining({
          template: "single-offer",
          format: "A4",
          offerData: expect.any(Object),
        })
      );
    });
  });
});
