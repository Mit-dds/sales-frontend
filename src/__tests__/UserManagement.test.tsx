import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserManagement from "@/pages/UserManagement";
import { apiClient } from "@/lib/api/apiClient";
import { toast } from "sonner";

// Mock providers and services
vi.mock("@/app/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "admin_123",
      name: "Super Admin",
      role: "admin",
    },
  }),
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
    patch: vi.fn(),
  },
}));

describe("UserManagement Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock response for users list
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes("admin/users/agent_777")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              user: {
                id: "agent_777",
                name: "Sarah Agent",
                email: "sarah@example.com",
                role: "agent",
                status: "ACTIVE",
                phone: "+971 50 123 4567",
                profileEmail: "sarah.display@example.com",
              },
            },
          },
        } as any);
      }
      return Promise.resolve({
        data: {
          success: true,
          data: {
            users: [
              {
                id: "agent_777",
                name: "Sarah Agent",
                email: "sarah@example.com",
                role: "agent",
                status: "ACTIVE",
              },
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 1,
              totalPages: 1,
            },
          },
        },
      } as any);
    });

    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        success: true,
        message: "User status updated successfully",
      },
    });
  });

  it("loads and renders users list correctly", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("admin/users", expect.any(Object));
      expect(screen.getByText("Sarah Agent")).toBeInTheDocument();
      expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
      expect(screen.getByText("agent")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    });
  });

  it("allows searching for users by entering query in the search input", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search by name or email...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by name or email...");
    fireEvent.change(searchInput, { target: { value: "Sarah" } });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenLastCalledWith(
        "admin/users",
        expect.objectContaining({
          params: expect.objectContaining({
            search: "Sarah",
            page: 1,
          }),
        })
      );
    });
  });

  it("can toggle account status dropdown and trigger status patch request", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Sarah Agent")).toBeInTheDocument();
    });

    // Find the actions menu button
    const actionsBtn = screen.getByRole("button");
    fireEvent.click(actionsBtn);

    // Dropdown options should appear
    expect(screen.getByRole("button", { name: "Inactive" })).toBeInTheDocument();
    
    // Click Inactive option
    const inactiveOpt = screen.getByRole("button", { name: "Inactive" });
    fireEvent.click(inactiveOpt);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("admin/users/agent_777/status", {
        status: "INACTIVE",
      });
      expect(toast.success).toHaveBeenCalledWith("User status updated successfully");
    });
  });

  it("can open profile details modal when clicking View Profile option", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Sarah Agent")).toBeInTheDocument();
    });

    const actionsBtn = screen.getByRole("button");
    fireEvent.click(actionsBtn);

    const viewProfileBtn = screen.getByRole("button", { name: "View Profile" });
    fireEvent.click(viewProfileBtn);

    // Profile detail fetch should be called
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("admin/users/agent_777");
    });

    // Check modal displays detailed info
    await waitFor(() => {
      expect(screen.getByText("sarah.display@example.com")).toBeInTheDocument();
      expect(screen.getByText("+971 50 123 4567")).toBeInTheDocument();
    });
  });
});
