import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "@/features/auth/context/authContextValue";
import LoginPage from "./LoginPage";

vi.mock("@/config/env", () => ({
  env: {
    apiBaseUrl: "http://localhost:5000/api/v1",
    googleClientId: "",
    facebookAppId: "",
  },
}));

vi.mock("@/features/auth/services/socialIdentityService", () => ({
  getGoogleIdToken: vi.fn(),
  getFacebookAccessToken: vi.fn(),
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          setAuthSession: vi.fn(),
        }}
      >
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  it("shows forgot password link", () => {
    renderLogin();

    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("disables unconfigured social providers", () => {
    renderLogin();

    expect(screen.getByRole("button", { name: /google unavailable/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /facebook unavailable/i })).toBeDisabled();
  });
});
