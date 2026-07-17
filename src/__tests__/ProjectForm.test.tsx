import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProjectForm from "@/pages/ProjectForm";
import { apiClient } from "@/lib/api/apiClient";

// Mock store actions
const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn();

vi.mock("@/lib/store/useProjectStore", () => ({
  useProjectStore: {
    getState: () => ({
      createProject: mockCreateProject,
      updateProject: mockUpdateProject,
    }),
  },
}));

// Mock UnitTypeEditor
vi.mock("../pages/UnitTypeEditor", () => ({
  default: ({ unitType, onSave, onCancel }: any) => (
    <div data-testid="mock-unit-type-editor">
      <span>Unit Type Editor for {unitType?.label || "New Type"}</span>
      <button onClick={() => onSave({ ...unitType, id: "ut_1", label: "Updated Type" })}>
        Save Unit Type
      </button>
      <button onClick={onCancel}>Cancel Unit Type</button>
    </div>
  ),
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

// Mock apiClient with a default resolved value for get to prevent unhandled TypeError inside useEffect hooks
vi.mock("@/lib/api/apiClient", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          unitTypes: [],
        },
      },
    }),
  },
}));

describe("ProjectForm Wizard Component", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders step 1 (Basics) by default with empty project structures", () => {
    render(<ProjectForm project={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    expect(screen.getByPlaceholderText("e.g. Verdana Residence")).toBeInTheDocument();
    expect(screen.getByText("Dubai")).toBeInTheDocument();
  });

  it("transitions between wizard steps and calls save on each transition", async () => {
    mockCreateProject.mockResolvedValue({ id: "new_proj_123", name: "New Verdana" });
    
    render(
      <ProjectForm project={null} onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    // Enter project name
    fireEvent.change(screen.getByPlaceholderText("e.g. Verdana Residence"), {
      target: { value: "New Verdana" },
    });
    
    // Click Save & Next to go to Step 2
    const nextBtn = screen.getByRole("button", { name: "Save & Next: Unit Types" });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Verdana" })
      );
      expect(screen.getByRole("button", { name: "+ Add Unit Type" })).toBeInTheDocument();
    });
  });

  it("opens and handles Unit Type Editor draft savings", async () => {
    // Start with a mock project already saved
    const project = {
      id: "proj_123",
      name: "Existing Project",
      location: "Dubai",
      type: "Apartments",
      status: "Off-plan",
      completionDate: "Q4 2026",
      whyBuy: [],
      unitTypes: [],
    } as any;

    localStorage.setItem("reportage_active_editing_step", "unittypes");

    render(<ProjectForm project={project} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    expect(screen.getByRole("button", { name: "+ Add Unit Type" })).toBeInTheDocument();

    const addUTBtn = screen.getByRole("button", { name: "+ Add Unit Type" });
    fireEvent.click(addUTBtn);

    // Verify editor is opened (using our mock)
    expect(screen.getByTestId("mock-unit-type-editor")).toBeInTheDocument();

    // Click Save inside Unit Type Editor
    fireEvent.click(screen.getByRole("button", { name: "Save Unit Type" }));

    // Verify we are back on step 2 and unit type card is rendered
    await waitFor(() => {
      expect(screen.queryByTestId("mock-unit-type-editor")).not.toBeInTheDocument();
      expect(screen.getByText("Updated Type")).toBeInTheDocument();
    });
  });

  it("handles Why Buy Step and triggers Gemini AI suggestions", async () => {
    const project = {
      id: "proj_123",
      name: "Taormina",
      location: "Dubai",
      type: "Apartments",
      status: "Off-plan",
      completionDate: "Q2 2027",
      whyBuy: ["Great ROI"],
      unitTypes: [],
    } as any;

    localStorage.setItem("reportage_active_editing_step", "why");
    
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          suggestions: ["High quality luxury finishing", "Prime Location"],
        },
      },
    });

    render(<ProjectForm project={project} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    expect(screen.getByText("Why Buy Highlights")).toBeInTheDocument();
    expect(screen.getByText("Great ROI")).toBeInTheDocument();

    const aiBtn = screen.getByRole("button", { name: "Re-generate with AI" });
    fireEvent.click(aiBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("projects/proj_123/why-buy/ai-suggestions");
      // Mapped suggestions added and rendered
      expect(screen.getByText("High quality luxury finishing")).toBeInTheDocument();
      expect(screen.getByText("Prime Location")).toBeInTheDocument();
    });
  });
});
