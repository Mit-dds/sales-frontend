import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/app/routes/guards/ProtectedRoute";
import { AdminRoute } from "@/app/routes/guards/AdminRoute";
import { PublicRoute } from "@/app/routes/guards/PublicRoute";

// Mock useAuth provider hook
let mockUser: any = null;
let mockIsLoading = false;

vi.mock("@/app/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockIsLoading,
  }),
}));

describe("Global Features — Route Guards", () => {
  describe("ProtectedRoute", () => {
    it("renders nothing (null) when user session is loading", () => {
      mockUser = null;
      mockIsLoading = true;

      const { container } = render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });

    it("redirects unauthenticated guest requests to login", () => {
      mockUser = null;
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });

    it("renders nested Outlet for authenticated requests", () => {
      mockUser = { id: "user_1", role: "agent" };
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    });
  });

  describe("AdminRoute", () => {
    it("redirects unauthenticated guest requests to login", () => {
      mockUser = null;
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/admin/settings"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/settings" element={<div>Admin Settings</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    it("redirects authenticated normal agents to offers page", () => {
      mockUser = { id: "user_2", role: "agent" };
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/admin/settings"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/settings" element={<div>Admin Settings</div>} />
            </Route>
            <Route path="/offers" element={<div>Offers Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Offers Page")).toBeInTheDocument();
      expect(screen.queryByText("Admin Settings")).not.toBeInTheDocument();
    });

    it("allows access for admin role", () => {
      mockUser = { id: "user_3", role: "admin" };
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/admin/settings"]}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/settings" element={<div>Admin Settings</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Admin Settings")).toBeInTheDocument();
    });
  });

  describe("PublicRoute", () => {
    it("redirects authenticated admin to projects root page", () => {
      mockUser = { id: "user_admin", role: "admin" };
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Login Page</div>} />
            </Route>
            <Route path="/projects" element={<div>Admin Projects Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Admin Projects Page")).toBeInTheDocument();
    });

    it("redirects authenticated agent to offers home page", () => {
      mockUser = { id: "user_agent", role: "agent" };
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Login Page</div>} />
            </Route>
            <Route path="/offers" element={<div>Offers Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Offers Page")).toBeInTheDocument();
    });

    it("renders login component for guests", () => {
      mockUser = null;
      mockIsLoading = false;

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Login Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });
});
