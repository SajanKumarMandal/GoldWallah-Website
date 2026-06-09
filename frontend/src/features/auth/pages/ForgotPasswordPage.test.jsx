import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ForgotPasswordPage from "./ForgotPasswordPage";

const forgotPasswordMock = vi.fn();

vi.mock("@/features/auth/services/authService", () => ({
  forgotPassword: (...args) => forgotPasswordMock(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset();
  });

  it("validates email before submit", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /send reset/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(forgotPasswordMock).not.toHaveBeenCalled();
  });

  it("shows generic success message after submit", async () => {
    forgotPasswordMock.mockResolvedValue({
      message: "If an account exists for this email, password reset instructions will be sent.",
    });
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "sajan@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset/i }));

    await waitFor(() => {
      expect(forgotPasswordMock).toHaveBeenCalledWith({
        email: "sajan@example.com",
      });
    });
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
  });
});

