import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Profile from "@/pages/Profile";
import { toast } from "sonner";

// Mock services & providers
const mockUpdateProfile = vi.fn();
let mockUser = {
  id: "agent_123",
  name: "Sarah Agent",
  email: "sarah@example.com",
  phone: "+971 50 123 4567",
  profileEmail: "sarah.display@example.com",
  role: "agent",
  photo: null as string | null,
  watermark: null as string | null,
};

vi.mock("@/app/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile,
  }),
}));

vi.mock("@/services/settings.service", () => ({
  settingsService: {
    get: vi.fn().mockReturnValue({
      teamName: "Reportage Sales Team",
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Profile Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUser = {
      id: "agent_123",
      name: "Sarah Agent",
      email: "sarah@example.com",
      phone: "+971 50 123 4567",
      profileEmail: "sarah.display@example.com",
      role: "agent",
      photo: null,
      watermark: null,
    };
  });

  it("renders profile fields with default values from useAuth on load", () => {
    render(<Profile />);

    expect(screen.getByDisplayValue("Sarah Agent")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+971 50 123 4567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("sarah.display@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Login email: sarah@example.com/)).toBeInTheDocument();
    expect(screen.getByText("Using default: Reportage Sales Team")).toBeInTheDocument();
  });

  it("allows changing Full Name and saving via updateProfile auth action", async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      ...mockUser,
      name: "Sarah Updated",
    });

    render(<Profile />);

    const nameInput = screen.getByDisplayValue("Sarah Agent");
    fireEvent.change(nameInput, { target: { value: "Sarah Updated" } });

    const saveBtn = screen.getByRole("button", { name: "Save Profile" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: "Sarah Updated" });
      expect(toast.success).toHaveBeenCalledWith("Profile saved");
      expect(screen.getByText("Profile saved!")).toBeInTheDocument();
    });
  });

  it("handles photo file uploads correctly", async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      ...mockUser,
      photo: "uploads/avatars/new_photo.png",
    });

    render(<Profile />);

    const file = new File(["dummy png content"], "avatar.png", { type: "image/png" });
    const inputEl = document.querySelector('input[accept=".jpg,.jpeg,.png"]')!;
    
    // Trigger input change event
    fireEvent.change(inputEl, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ photo: file });
      expect(toast.success).toHaveBeenCalledWith("Photo uploaded");
    });
  });
});
