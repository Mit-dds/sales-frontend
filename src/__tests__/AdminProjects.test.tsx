import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminProjects from "@/pages/AdminProjects";
import { toast } from "sonner";

// Mock store
const mockFetchProjects = vi.fn();
const mockDeleteProject = vi.fn();
const mockFetchProjectById = vi.fn();

let mockProjectsList: any[] = [];
let mockLoading = false;
let mockError: string | null = null;

vi.mock("@/lib/store/useProjectStore", () => ({
  useProjectStore: () => ({
    fetchProjects: mockFetchProjects,
    deleteProject: mockDeleteProject,
    fetchProjectById: mockFetchProjectById,
    loading: mockLoading,
    error: mockError,
    projects: mockProjectsList,
  }),
}));

// Mock ProjectForm (using relative path to src/pages/ProjectForm from test file location)
vi.mock("../pages/ProjectForm", () => ({
  default: ({ project, onSave, onCancel }: any) => (
    <div data-testid="mock-project-form">
      <span>Project Form for {project ? project.name : "New Project"}</span>
      <button onClick={onSave}>Save Project</button>
      <button onClick={onCancel}>Cancel Edit</button>
    </div>
  ),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AdminProjects Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockProjectsList = [
      {
        id: "cmr_proj_1",
        name: "Taormina Village",
        status: "Off-plan",
        location: "Dubai",
        type: "Townhouses",
        completionDate: "Q4 2026",
        primaryColor: "#C9A84C",
        secondaryColor: "#E4C97A",
        whyBuyCount: 5,
        unitTypeCount: 2,
        totalPlans: 3,
      },
    ];
    mockLoading = false;
    mockError = null;
  });

  it("fetches projects list on mount", () => {
    render(<AdminProjects />);
    expect(mockFetchProjects).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("renders loader when loading and projects array is empty", () => {
    mockLoading = true;
    mockProjectsList = [];
    render(<AdminProjects />);
    expect(screen.getByText("Loading projects...")).toBeInTheDocument();
  });

  it("renders error state when store returns error", () => {
    mockError = "Fetch failed";
    mockProjectsList = [];
    render(<AdminProjects />);
    expect(screen.getByText("Error: Fetch failed")).toBeInTheDocument();
  });

  it("renders empty state message when no projects found", () => {
    mockProjectsList = [];
    render(<AdminProjects />);
    expect(screen.getByText("No projects found.")).toBeInTheDocument();
  });

  it("renders project cards correctly", () => {
    render(<AdminProjects />);
    expect(screen.getByText("Taormina Village")).toBeInTheDocument();
    expect(screen.getByText("Dubai Townhouses")).toBeInTheDocument();
    expect(screen.getByText(/Q4 2026/)).toBeInTheDocument();
    expect(screen.getByText("3 plans 2 types")).toBeInTheDocument();
    expect(screen.getByText("5 pts")).toBeInTheDocument();
  });

  it("transitions to creation form when clicking New Project", () => {
    render(<AdminProjects />);
    const newBtn = screen.getByRole("button", { name: "+ New Project" });
    fireEvent.click(newBtn);

    expect(screen.getByTestId("mock-project-form")).toBeInTheDocument();
    expect(screen.getByText("Project Form for New Project")).toBeInTheDocument();
  });

  it("loads editing form when clicking Edit and fetches project details", async () => {
    const fullProjectDetails = {
      id: "cmr_proj_1",
      name: "Taormina Village",
      status: "OffPlan",
      location: "Dubai",
      type: "Townhouses",
      completionDate: "Q4 2026",
      unitTypes: [],
      whyBuy: ["Point 1"],
    };
    mockFetchProjectById.mockResolvedValueOnce(fullProjectDetails);

    render(<AdminProjects />);
    const editBtn = screen.getByRole("button", { name: "Edit" });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(mockFetchProjectById).toHaveBeenCalledWith("cmr_proj_1");
      expect(screen.getByTestId("mock-project-form")).toBeInTheDocument();
      expect(screen.getByText("Project Form for Taormina Village")).toBeInTheDocument();
    });
  });

  it("opens confirm delete modal and deletes project successfully", async () => {
    render(<AdminProjects />);
    const delBtn = screen.getByRole("button", { name: "Del" });
    fireEvent.click(delBtn);

    // Verify modal message is shown (ConfirmDialog uses message as the modal title/header)
    expect(screen.getByText("Delete Taormina Village?")).toBeInTheDocument();
    expect(screen.getByText("This will remove the project and all its units.")).toBeInTheDocument();

    // Click confirm delete button inside Modal
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteProject).toHaveBeenCalledWith("cmr_proj_1");
      expect(toast.success).toHaveBeenCalledWith("Project deleted successfully");
      expect(mockFetchProjects).toHaveBeenCalledTimes(2); // Initial + after delete
    });
  });
});
