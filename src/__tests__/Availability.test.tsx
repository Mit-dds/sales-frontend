import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Availability from "@/pages/Availability";
import { apiClient } from "@/lib/api/apiClient";
import { toast } from "sonner";

// Mock store
const mockSetImportData = vi.fn();
const mockClearImportData = vi.fn();

let mockStoreData = {
  projects: [] as any[],
  parseResult: null as any,
  setImportData: mockSetImportData,
  clearImportData: mockClearImportData,
};

vi.mock("@/lib/store/useAvailabilityStore", () => ({
  useAvailabilityStore: () => mockStoreData,
}));

// Mock sonner toast
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
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Availability Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockStoreData = {
      projects: [],
      parseResult: null,
      setImportData: mockSetImportData,
      clearImportData: mockClearImportData,
    };
  });

  it("renders empty state correctly with 0 units loaded", () => {
    render(<Availability />);
    expect(screen.getByText("0 total units loaded")).toBeInTheDocument();
    expect(screen.getByText("Drop Master Availability File Here")).toBeInTheDocument();
  });

  it("renders projects list and totals from store", () => {
    mockStoreData.projects = [
      {
        projectId: "proj_1",
        projectName: "Taormina",
        units: [{ id: "u_1" }, { id: "u_2" }],
      },
    ];
    render(<Availability />);
    
    expect(screen.getByText("2 total units loaded")).toBeInTheDocument();
    expect(screen.getByText("Taormina: 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear All" })).toBeInTheDocument();
  });

  it("handles clear all confirm trigger and calls clear store after API request", async () => {
    mockStoreData.projects = [
      {
        projectId: "proj_1",
        projectName: "Taormina",
        units: [{ id: "u_1" }],
      },
    ];
    
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      data: {
        success: true,
        message: "Availability cleared successfully",
      },
    });

    render(<Availability />);

    // Click Clear All
    const clearBtn = screen.getByRole("button", { name: "Clear All" });
    fireEvent.click(clearBtn);

    // Verify modal is shown
    expect(screen.getByText("Clear all availability data?")).toBeInTheDocument();
    expect(screen.getByText("This removes all imported units from the application.")).toBeInTheDocument();

    // Click confirm (yes) button
    const confirmBtn = screen.getByRole("button", { name: "Yes" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith("availability");
      expect(mockClearImportData).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Availability cleared successfully");
    });
  });

  it("uploads availability excel file and parses response data", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          projects: [
            {
              projectId: "proj_1",
              projectName: "Taormina",
              unitCount: 1,
              units: [
                {
                  id: "u_1",
                  number: "101",
                  type: "Studio",
                  floor: "1",
                  internal: 300,
                  external: 50,
                  total: 350,
                  price: 500000,
                },
              ],
            },
          ],
          summary: {
            totalImported: 1,
            totalSkipped: 0,
          },
        },
      },
    });

    render(<Availability />);

    // Simulate file input change
    const file = new File(["dummy excel content"], "availability_list.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Query hidden file input element from container
    const inputEl = document.querySelector('input[type="file"]')!;
    
    fireEvent.change(inputEl, {
      target: { files: [file] },
    });

    // Confirm dialog should open before parsing
    expect(screen.getByText("Replace all availability?")).toBeInTheDocument();
    
    // Click yes to proceed with upload
    const confirmBtn = screen.getByRole("button", { name: "Yes" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "availability/import",
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      );
      expect(mockSetImportData).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ totalImported: 1, totalSkipped: 0 }),
        "availability_list.xlsx"
      );
      expect(toast.success).toHaveBeenCalledWith("1 units imported from availability_list.xlsx");
    });
  });
});
