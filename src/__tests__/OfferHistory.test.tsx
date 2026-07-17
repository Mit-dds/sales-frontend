import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import OfferHistory from "@/pages/OfferHistory";
import { apiClient } from "@/lib/api/apiClient";

// Mock providers and services
let mockUserRole = "admin";
vi.mock("@/app/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "agent_1",
      name: "Sarah Agent",
      role: mockUserRole,
    },
  }),
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("OfferHistory Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUserRole = "admin";

    // Set default response implementation for apiClient.get("offers")
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          offers: [
            {
              id: "off_1",
              date: "2026-06-25T12:00:00Z",
              agentId: "agent_1",
              agentName: "Sarah Agent",
              clientName: "John Doe",
              clientPhone: "+971 50 111 2222",
              projectName: "Taormina Village",
              unitNumber: "RH-06-10",
              unitType: "3BR",
              planLabel: "10% DP + 1% Monthly",
              offerMode: "normal",
              discount: 5,
              netPrice: 1425000,
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
          stats: {
            totalOffers: 1,
            thisMonth: 1,
            singleOffers: 1,
            multiPlan: 0,
          },
        },
      },
    });
  });

  it("renders loader by default, then loads and displays stat cards and table rows", async () => {
    render(<OfferHistory />);

    expect(screen.getByText("Loading offers...")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("offers", expect.any(Object));
      expect(screen.getByText("Total Offers")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getAllByText("Taormina Village").length).toBeGreaterThan(0);
      expect(screen.getByText("RH-06-10")).toBeInTheDocument();
      expect(screen.getByText("AED 1,425,000")).toBeInTheDocument();
    });
  });

  it("filters listings based on client search text field", async () => {
    render(<OfferHistory />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search client or unit...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search client or unit...");
    fireEvent.change(searchInput, { target: { value: "John" } });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenLastCalledWith(
        "offers",
        expect.objectContaining({
          params: expect.objectContaining({
            search: "John",
            page: 1,
          }),
        })
      );
    });
  });

  it("restricts agent filters dropdown when roles are normal agents", async () => {
    mockUserRole = "agent"; // Change role
    render(<OfferHistory />);

    await waitFor(() => {
      expect(screen.getAllByText("Taormina Village").length).toBeGreaterThan(0);
      // Dropdown for agents should not be rendered
      expect(screen.queryByRole("combobox", { name: /agent/i })).not.toBeInTheDocument();
      expect(screen.queryByText("All Agents")).not.toBeInTheDocument();
    });
  });
});
