import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import VerifyOtp from "@/pages/VerifyOtp";
import ResetPassword from "@/pages/ResetPassword";
import PendingApproval from "@/pages/PendingApproval";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/apiClient";
import { rateLimitService } from "@/lib/auth/rateLimit.service";

// Mock providers and tools
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
let mockUser: any = null;

vi.mock("@/app/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    signIn: mockSignIn,
    signOut: mockSignOut,
    updateUser: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();
let mockLocationState: any = null;

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: mockLocationState,
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
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("Authentication Module Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockLocationState = null;
    vi.restoreAllMocks();

    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, "setTimeout").mockImplementation((cb: any, ms?: number, ...args: any[]) => {
      if (ms === 3000 || ms === 2000) {
        cb();
        return 0 as any;
      }
      return originalSetTimeout(cb, ms, ...args);
    });
  });

  describe("Login Component", () => {
    it("renders Sign In fields by default", () => {
      render(<Login />);
      expect(screen.getByPlaceholderText("Email or phone number")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    });

    it("switches to Register mode when tab clicked", () => {
      render(<Login />);
      const createAccountTab = screen.getByText("Create Account");
      fireEvent.click(createAccountTab);
      expect(screen.getByPlaceholderText("Your full name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("you@reportage.ae")).toBeInTheDocument();
    });

    it("validates fields for Sign In", async () => {
      render(<Login />);
      const signInBtn = screen.getByRole("button", { name: "Sign In" });
      fireEvent.click(signInBtn);

      await waitFor(() => {
        expect(screen.getByText("Email or phone is required")).toBeInTheDocument();
        expect(screen.getByText("Password is required")).toBeInTheDocument();
      });
    });

    it("triggers successful signin and redirects based on user role (agent)", async () => {
      const agentUser = { id: "1", name: "Agent User", role: "agent", email: "test@example.com" };
      mockSignIn.mockResolvedValueOnce(agentUser);

      const { container } = render(<Login />);
      fireEvent.change(screen.getByPlaceholderText("Email or phone number"), {
        target: { value: "test@example.com" },
      });
      
      const passInput = container.querySelector('input[type="password"]');
      if (passInput) {
        fireEvent.change(passInput, { target: { value: "password123" } });
      }

      const signInBtn = screen.getByRole("button", { name: "Sign In" });
      fireEvent.click(signInBtn);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
        expect(toast.success).toHaveBeenCalledWith("Welcome back, Agent User");
        expect(mockNavigate).toHaveBeenCalledWith("/offers", { replace: true });
      });
    });

    it("triggers successful signin and redirects based on user role (admin)", async () => {
      const adminUser = { id: "2", name: "Admin User", role: "admin", email: "admin@example.com" };
      mockSignIn.mockResolvedValueOnce(adminUser);

      const { container } = render(<Login />);
      fireEvent.change(screen.getByPlaceholderText("Email or phone number"), {
        target: { value: "admin@example.com" },
      });
      
      const passInput = container.querySelector('input[type="password"]');
      if (passInput) {
        fireEvent.change(passInput, { target: { value: "adminpassword" } });
      }

      const signInBtn = screen.getByRole("button", { name: "Sign In" });
      fireEvent.click(signInBtn);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("admin@example.com", "adminpassword");
        expect(toast.success).toHaveBeenCalledWith("Welcome back, Admin User");
        expect(mockNavigate).toHaveBeenCalledWith("/projects", { replace: true });
      });
    });

    it("enforces rate-limiting upon consecutive failures", async () => {
      vi.spyOn(rateLimitService, "check").mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        lockedUntil: Date.now() + 30000,
      });

      const { container } = render(<Login />);
      fireEvent.change(screen.getByPlaceholderText("Email or phone number"), {
        target: { value: "locked@example.com" },
      });

      const passInput = container.querySelector('input[type="password"]');
      if (passInput) {
        fireEvent.change(passInput, { target: { value: "password123" } });
      }
      
      const signInBtn = screen.getByRole("button", { name: "Sign In" });
      fireEvent.click(signInBtn);

      await waitFor(() => {
        expect(screen.getByText(/Too many attempts/)).toBeInTheDocument();
      });
    });

    it("supports user registration and switches to signin mode", async () => {
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: { success: true, message: "Registration successful" },
      });

      const { container } = render(<Login />);
      fireEvent.click(screen.getByText("Create Account"));

      fireEvent.change(screen.getByPlaceholderText("Your full name"), { target: { value: "John Doe" } });
      fireEvent.change(screen.getByPlaceholderText("you@reportage.ae"), { target: { value: "john@example.com" } });
      
      const passInput = container.querySelector('input[type="password"]');
      if (passInput) {
        fireEvent.change(passInput, { target: { value: "password123" } });
      }

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith("auth/register", expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
        }));
        expect(toast.success).toHaveBeenCalledWith("Registration successful");
      });

      // Verify that it switched mode to signin automatically because of the mocked setTimeout
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Email or phone number")).toBeInTheDocument();
      });
    });
  });

  describe("ForgotPassword Component", () => {
    it("validates empty email", async () => {
      render(<ForgotPassword />);
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      await waitFor(() => {
        expect(screen.getByText("Email is required")).toBeInTheDocument();
      });
    });

    it("validates invalid email format", async () => {
      render(<ForgotPassword />);
      fireEvent.change(screen.getByPlaceholderText("you@reportage.ae"), {
        target: { value: "invalidemail" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      await waitFor(() => {
        expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
      });
    });

    it("dispatches OTP on valid email submission", async () => {
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: { success: true, message: "OTP sent successfully" },
      });

      render(<ForgotPassword />);
      fireEvent.change(screen.getByPlaceholderText("you@reportage.ae"), {
        target: { value: "forgot@example.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith("auth/forgot-password", {
          email: "forgot@example.com",
        });
        expect(toast.success).toHaveBeenCalledWith("OTP sent successfully");
        expect(mockNavigate).toHaveBeenCalledWith("/verify-otp", {
          state: { email: "forgot@example.com" },
        });
      });
    });
  });

  describe("VerifyOtp Component", () => {
    it("redirects to forgot password if no email state present", () => {
      mockLocationState = null;
      render(<VerifyOtp />);
      expect(toast.error).toHaveBeenCalledWith("Please request a password reset code first.");
      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password", { replace: true });
    });

    it("submits valid 6-digit OTP and redirects to reset password", async () => {
      mockLocationState = { email: "otp@example.com" };
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: { success: true, message: "OTP verified", data: { resetToken: "my-reset-token" } },
      });

      render(<VerifyOtp />);
      const otpInput = screen.getByPlaceholderText("000000");
      fireEvent.change(otpInput, { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith("auth/verify-otp", {
          email: "otp@example.com",
          otp: "123456",
        });
        expect(toast.success).toHaveBeenCalledWith("OTP verified");
        expect(mockNavigate).toHaveBeenCalledWith("/reset-password", {
          state: { resetToken: "my-reset-token" },
        });
      });
    });
  });

  describe("ResetPassword Component", () => {
    it("redirects if no resetToken in state", () => {
      mockLocationState = null;
      render(<ResetPassword />);
      expect(toast.error).toHaveBeenCalledWith("Invalid session. Please request a new verification code.");
      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password", { replace: true });
    });

    it("validates password length and match", async () => {
      mockLocationState = { resetToken: "my-token" };
      render(<ResetPassword />);

      const newPassInput = screen.getByPlaceholderText("Enter new password");
      const confirmPassInput = screen.getByPlaceholderText("Confirm new password");
      const continueBtn = screen.getByRole("button", { name: "Continue" });

      // Short password
      fireEvent.change(newPassInput, { target: { value: "123" } });
      fireEvent.click(continueBtn);
      await waitFor(() => {
        expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
      });

      // Unmatched confirmation
      fireEvent.change(newPassInput, { target: { value: "password123" } });
      fireEvent.change(confirmPassInput, { target: { value: "different123" } });
      fireEvent.click(continueBtn);
      await waitFor(() => {
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
      });
    });

    it("resets password successfully and redirects to login", async () => {
      mockLocationState = { resetToken: "valid-token" };
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: { success: true, message: "Password reset successfully!" },
      });

      render(<ResetPassword />);
      fireEvent.change(screen.getByPlaceholderText("Enter new password"), { target: { value: "password123" } });
      fireEvent.change(screen.getByPlaceholderText("Confirm new password"), { target: { value: "password123" } });

      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith("auth/reset-password", {
          resetToken: "valid-token",
          newPassword: "password123",
        });
        expect(toast.success).toHaveBeenCalledWith("Password reset successfully!");
        expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
      });
    });
  });

  describe("PendingApproval Component", () => {
    it("renders user information and triggers sign out", () => {
      mockUser = { id: "1", name: "Agent User", role: "agent", email: "pending@example.com" };
      render(<PendingApproval />);

      expect(screen.getByText("pending@example.com")).toBeInTheDocument();
      const signOutBtn = screen.getByRole("button", { name: "Sign Out" });
      fireEvent.click(signOutBtn);

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });
});
