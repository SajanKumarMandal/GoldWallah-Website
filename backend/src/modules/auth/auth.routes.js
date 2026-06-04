import rateLimit from "express-rate-limit";
import { Router } from "express";

import * as authController from "./auth.controller.js";

export const authRouter = Router();

// Login endpoints are rate-limited separately from registration and OTP so one
// abuse path cannot exhaust every auth workflow.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many login attempts. Please try again later.",
      code: "LOGIN_RATE_LIMITED",
    },
  },
});

// Registration is more expensive and abuse-sensitive, so it has a lower hourly cap.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many registration attempts. Please try again later.",
      code: "REGISTER_RATE_LIMITED",
    },
  },
});

// OTP send/verify endpoints share a tight limiter to reduce SMS abuse and brute force.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many OTP attempts. Please try again later.",
      code: "OTP_RATE_LIMITED",
    },
  },
});

// Refresh/logout may run frequently from active browser sessions, but still need
// a ceiling to protect the API from loops or scripted abuse.
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many session requests. Please try again later.",
      code: "SESSION_RATE_LIMITED",
    },
  },
});

authRouter.get("/", (_request, response) => {
  // Lightweight module health/capability endpoint for API discovery.
  response.status(200).json({
    module: "auth",
    status: "ready",
    capabilities: [
      "email-password auth",
      "mobile OTP auth",
      "Google ID token verification",
      "Facebook access token verification",
      "JWT access tokens with HttpOnly refresh-token rotation",
      "CSRF-resistant browser auth requests",
    ],
  });
});

// Public browser auth routes. Controllers still enforce trusted origin, CSRF
// header presence for unsafe methods, and schema validation.
authRouter.post("/register", registerLimiter, authController.register);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.post("/refresh", sessionLimiter, authController.refresh);
authRouter.post("/logout", sessionLimiter, authController.logout);
authRouter.post("/otp/login/send", otpLimiter, authController.sendLoginOtp);
authRouter.post("/otp/login/verify", otpLimiter, authController.verifyLoginOtp);
authRouter.post("/otp/register/send", otpLimiter, authController.sendRegisterOtp);
authRouter.post("/otp/register/verify", otpLimiter, authController.verifyRegisterOtp);
authRouter.post("/google/login", loginLimiter, authController.googleLogin);
authRouter.post("/google/register", registerLimiter, authController.googleRegister);
authRouter.post("/facebook/login", loginLimiter, authController.facebookLogin);
authRouter.post("/facebook/register", registerLimiter, authController.facebookRegister);
