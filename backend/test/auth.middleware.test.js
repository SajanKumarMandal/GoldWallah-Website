import { describe, expect, it, vi } from "vitest";

vi.mock("../src/config/env.js", () => ({
  env: {
    jwtAccessSecret: "access-secret-32-characters-long",
  },
}));

vi.mock("../src/modules/users/users.repository.js", () => ({
  findUserById: vi.fn(),
}));

import { authenticate, requireRole } from "../src/middleware/auth.js";
import {
  requireJewellerCanBid,
  requireSellerKycApproved,
} from "../src/middleware/verificationGuards.js";

function request(headers = {}) {
  return {
    get(name) {
      return headers[name.toLowerCase()] || "";
    },
  };
}

describe("auth middleware", () => {
  it("blocks unauthenticated requests", async () => {
    let nextError;

    await authenticate(request(), {}, (error) => {
      nextError = error;
    });

    expect(nextError?.statusCode).toBe(401);
    expect(nextError?.code).toBe("UNAUTHORIZED");
  });

  it("enforces role guards", () => {
    const next = vi.fn();

    requireRole("SELLER")({ user: { role: "JEWELLER" } }, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("requires seller KYC for seller listing actions", () => {
    const next = vi.fn();

    requireSellerKycApproved(
      { user: { role: "SELLER", kycStatus: "PENDING" } },
      {},
      next,
    );

    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 403,
      code: "KYC_REQUIRED",
    });
  });

  it("requires full jeweller bidding eligibility", () => {
    const next = vi.fn();

    requireJewellerCanBid(
      {
        user: {
          role: "JEWELLER",
          kycStatus: "APPROVED",
          businessVerificationStatus: "APPROVED",
          commissionLockStatus: "LOCKED",
        },
      },
      {},
      next,
    );

    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 403,
      code: "COMMISSION_LOCKED",
    });
  });
});
