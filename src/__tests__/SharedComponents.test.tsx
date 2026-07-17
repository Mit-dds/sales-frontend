import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState } from "@/components/ui";

describe("Shared UI Components", () => {
  describe("Avatar Component", () => {
    it("renders initials correctly when name is provided", () => {
      render(<Avatar name="John Doe" size={32} />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("renders initials for single word names", () => {
      render(<Avatar name="Alice" size={32} />);
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("renders image if photo URL is provided", () => {
      render(<Avatar name="Alice" photo="/avatar.png" size={32} />);
      const img = screen.getByAltText("Alice");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/avatar.png");
    });
  });

  describe("Badge Component", () => {
    it("renders children content correctly", () => {
      render(<Badge>Active Status</Badge>);
      expect(screen.getByText("Active Status")).toBeInTheDocument();
    });

    it("applies variant styles correctly", () => {
      const { container } = render(<Badge variant="error">Error</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("bg-red-dim");
    });
  });

  describe("Button Component", () => {
    it("renders child text", () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole("button", { name: "Click Me" })).toBeInTheDocument();
    });

    it("fires click callback on user interaction", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByRole("button", { name: "Click Me" }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("is disabled when disabled prop is true", () => {
      render(<Button disabled>Submit</Button>);
      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    });
  });

  describe("Card Component", () => {
    it("renders children inside card structure", () => {
      render(<Card><h3>Card Title</h3><p>Content</p></Card>);
      expect(screen.getByRole("heading", { name: "Card Title" })).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });

  describe("ConfirmDialog Component", () => {
    it("calls onClose when cancel is clicked", () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <ConfirmDialog
          open={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Delete Confirmation"
          message="Are you sure you want to delete this?"
          detail="This action is irreversible."
          confirmLabel="Yes, Delete"
        />
      );

      expect(screen.getByText("Are you sure you want to delete this?")).toBeInTheDocument();
      expect(screen.getByText("This action is irreversible.")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(handleConfirm).not.toHaveBeenCalled();
    });

    it("calls onConfirm when confirm button is clicked", () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <ConfirmDialog
          open={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Delete Confirmation"
          message="Are you sure you want to delete this?"
          confirmLabel="Yes, Delete"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Yes, Delete" }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1); // Confirm calls onClose immediately after execution
    });
  });

  describe("EmptyState Component", () => {
    it("renders message and description properly", () => {
      render(
        <EmptyState
          title="No records found"
          description="Try reloading the page."
        />
      );
      expect(screen.getByText("No records found")).toBeInTheDocument();
      expect(screen.getByText("Try reloading the page.")).toBeInTheDocument();
    });
  });
});
