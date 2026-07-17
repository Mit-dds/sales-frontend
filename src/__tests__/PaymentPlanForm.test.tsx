import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PaymentPlanForm from "@/pages/PaymentPlanForm";
import type { PaymentPlan } from "@/types";

describe("PaymentPlanForm Component", () => {
  const mockOnAdd = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnUpdate = vi.fn();

  const mockPlans: PaymentPlan[] = [
    {
      id: "pp_1",
      label: "10% DP + 1% Monthly",
      dp: 10,
      installmentPct: 1,
      onHandover: 90,
      durationType: "till_handover",
      durationMonths: null,
      discount: 5,
      planType: "normal",
      eventName: "",
      eventDiscount: null,
      eventInstallmentPct: null,
      eventDurationType: "till_handover",
      eventDurationMonths: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a table of existing payment plans", () => {
    render(
      <PaymentPlanForm
        plans={mockPlans}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        primaryColor="#1A3C6B"
      />
    );

    expect(screen.getByText("10% DP + 1% Monthly")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("1%/mo")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("triggers onRemove when clicking delete button", () => {
    render(
      <PaymentPlanForm
        plans={mockPlans}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        primaryColor="#1A3C6B"
      />
    );

    // The delete button uses a lucide X icon, let's find it by empty name
    const deleteBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(deleteBtn);

    expect(mockOnRemove).toHaveBeenCalledWith("pp_1");
  });

  it("can add a custom payment plan", () => {
    render(
      <PaymentPlanForm
        plans={mockPlans}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        primaryColor="#1A3C6B"
      />
    );

    // Enter plan label
    fireEvent.change(screen.getByPlaceholderText("e.g. 30% DP + 1% Monthly"), {
      target: { value: "Custom Plan 30" },
    });

    // Enter DP % (placeholder is 30 in code)
    fireEvent.change(screen.getByPlaceholderText("30"), {
      target: { value: "30" },
    });

    // Enter Installment % (placeholder is 1 in code)
    fireEvent.change(screen.getByPlaceholderText("1"), {
      target: { value: "1.5" },
    });

    // Click + Add Plan
    const addBtn = screen.getByRole("button", { name: "+ Add Plan" });
    fireEvent.click(addBtn);

    expect(mockOnAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Custom Plan 30",
        dp: 30,
        installmentPct: 1.5,
        planType: "normal",
      })
    );
  });

  it("enters edit mode, updates plan and calls onUpdate", () => {
    render(
      <PaymentPlanForm
        plans={mockPlans}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onUpdate={mockOnUpdate}
        primaryColor="#1A3C6B"
      />
    );

    // Click edit on existing plan
    const editBtn = screen.getByRole("button", { name: "Edit" });
    fireEvent.click(editBtn);

    // Label should be loaded in input
    const labelInput = screen.getByPlaceholderText("e.g. 30% DP + 1% Monthly");
    expect(labelInput).toHaveValue("10% DP + 1% Monthly");

    // Change value
    fireEvent.change(labelInput, { target: { value: "10% DP + 1.2% Monthly" } });

    // The button text should now be "Save Changes" in edit mode
    const saveBtn = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(saveBtn);

    expect(mockOnUpdate).toHaveBeenCalledWith(
      "pp_1",
      expect.objectContaining({
        label: "10% DP + 1.2% Monthly",
        dp: 10,
        installmentPct: 1,
      })
    );
  });
});
