import { describe, expect, it } from "vitest";

import {
  registerSchema,
  validateBody,
  normalizePhone,
} from "../src/modules/auth/auth.validation.js";

describe("auth validation", () => {
  it("normalizes trusted register fields", () => {
    const payload = validateBody(registerSchema, {
      fullName: "Sajan Kumar",
      email: "SAJAN@example.com",
      phone: "+91 9876543210",
      password: "StrongPass123",
      role: "SELLER",
    });

    expect(payload.email).toBe("sajan@example.com");
    expect(normalizePhone(payload.phone)).toBe("9876543210");
    expect(payload.role).toBe("SELLER");
  });

  it("rejects tampered roles before service code runs", () => {
    expect(() =>
      validateBody(registerSchema, {
        fullName: "Sajan Kumar",
        email: "sajan@example.com",
        phone: "9876543210",
        password: "StrongPass123",
        role: "ADMIN",
      }),
    ).toThrow(/Invalid request body/);
  });
});
