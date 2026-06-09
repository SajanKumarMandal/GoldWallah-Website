import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/features/auth/context/authContextValue";
import ProtectedRoute from "./ProtectedRoute";

function renderProtected(value) {
  return render(
    <MemoryRouter initialEntries={["/seller/dashboard"]}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/seller/dashboard" element={<div>Protected content</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("waits while session restore is loading", () => {
    renderProtected({ isAuthenticated: false, isSessionLoading: true });

    expect(screen.getByText(/restoring secure session/i)).toBeInTheDocument();
  });

  it("redirects unauthenticated users", () => {
    renderProtected({ isAuthenticated: false, isSessionLoading: false });

    expect(screen.getByText(/login page/i)).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    renderProtected({ isAuthenticated: true, isSessionLoading: false });

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });
});

