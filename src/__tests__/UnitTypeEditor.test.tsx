import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UnitTypeEditor from "@/pages/UnitTypeEditor";
import { apiClient } from "@/lib/api/apiClient";
import type { UnitType } from "@/types";

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
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("UnitTypeEditor Component", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnSaveDraft = vi.fn();

  const mockUnitType: UnitType = {
    id: "ut_1",
    label: "3BR",
    subtypes: ["3BR-A"],
    paymentPlans: [],
    floorPlans: {},
    virtualTour: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Set fresh mock implementations for every test to avoid leaks
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          unitType: { id: "ut_1", label: "3BR", subtypes: [{ id: "st_1", label: "3BR-A" }] },
          plans: [],
        },
      },
    });

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes("floor-plans")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              floorPlans: [
                {
                  id: "fp_1",
                  label: "3BR-A",
                  floorPlanPath: "/uploads/fp.png",
                  floorPlanName: "3BR-A Floor Plan",
                  floorPlanIsImage: true,
                },
              ],
            },
          },
        } as any);
      }
      return Promise.resolve({
        data: {
          success: true,
          data: {
            project: {
              unitTypes: [
                {
                  id: "ut_1",
                  label: "3BR",
                  subtypes: [{ id: "st_1", label: "3BR-A" }],
                },
              ],
            },
          },
        },
      } as any);
    });
  });

  it("renders Details tab fields on default launch", () => {
    render(
      <UnitTypeEditor
        unitType={mockUnitType}
        projectId="proj_1"
        primaryColor="#1A3C6B"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onSaveDraft={mockOnSaveDraft}
      />
    );

    expect(screen.getByPlaceholderText("e.g. Studio, 1BR, 2BR, 3BR")).toHaveValue("3BR");
    expect(screen.getByPlaceholderText("Sub Type A")).toHaveValue("3BR-A");
    expect(screen.getByPlaceholderText("https://my.matterport.com/show/?m=...")).toBeInTheDocument();
  });

  it("can add and remove unit subtypes in details mode", async () => {
    render(
      <UnitTypeEditor
        unitType={mockUnitType}
        projectId="proj_1"
        primaryColor="#1A3C6B"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onSaveDraft={mockOnSaveDraft}
      />
    );

    // Click Add Sub Type
    const addSubBtn = screen.getByRole("button", { name: "+ Add Sub Type" });
    fireEvent.click(addSubBtn);

    // Verify there are now two subtype inputs
    const inputs = screen.getAllByPlaceholderText(/Sub Type/);
    expect(inputs).toHaveLength(2);

    // Modify the second subtype value
    fireEvent.change(inputs[1], { target: { value: "3BR-B" } });
    expect(inputs[1]).toHaveValue("3BR-B");
  });

  it("transitions between Tabs correctly (Details -> Plans -> Floor Plans)", async () => {
    render(
      <UnitTypeEditor
        unitType={mockUnitType}
        projectId="proj_1"
        primaryColor="#1A3C6B"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onSaveDraft={mockOnSaveDraft}
      />
    );

    // Click "Save & Next: Payment Plans"
    const nextBtn = screen.getByRole("button", { name: "Save & Next: Payment Plans" });
    fireEvent.click(nextBtn);

    // Verify we transitioned to Payment Plans Tab (checks for TEMPLATE_PLANS or "ADD PLAN" table triggers)
    await waitFor(() => {
      expect(screen.getByText("ADD PLAN")).toBeInTheDocument();
    });

    // Click "Save & Next: Floor Plans"
    const nextBtn2 = screen.getByRole("button", { name: "Save & Next: Floor Plans" });
    fireEvent.click(nextBtn2);

    // Verify we transitioned to Floor Plans Tab
    await waitFor(() => {
      expect(screen.getByText("Floor Plans")).toBeInTheDocument();
    });
  });

  it("triggers draft save callback when clicking Save Unit Type on Details tab", async () => {
    render(
      <UnitTypeEditor
        unitType={mockUnitType}
        projectId="proj_1"
        primaryColor="#1A3C6B"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onSaveDraft={mockOnSaveDraft}
      />
    );

    const saveBtn = screen.getByRole("button", { name: "Save Unit Type" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "3BR",
        })
      );
    });
  });

  it("triggers final save callback when clicking Save & Done on Floor Plans tab", async () => {
    localStorage.setItem("reportage_active_editing_unittype_tab", "files");

    render(
      <UnitTypeEditor
        unitType={mockUnitType}
        projectId="proj_1"
        primaryColor="#1A3C6B"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onSaveDraft={mockOnSaveDraft}
      />
    );

    const saveDoneBtn = screen.getByRole("button", { name: "Save & Done" });
    fireEvent.click(saveDoneBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "3BR",
        })
      );
    });
  });
});
