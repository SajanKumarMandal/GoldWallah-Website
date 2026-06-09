import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import { createRateLimiter } from "../../middleware/rateLimiter.js";
import * as authController from "./auth.controller.js";

export const authRouter = Router();

// Login endpoints are rate-limited separately from registration and OTP so one
// abuse path cannot exhaust every auth workflow.
const loginLimiter = createRateLimiter({
  name: "auth-login",
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: {
    error: {
      message: "Too many login attempts. Please try again later.",
      code: "LOGIN_RATE_LIMITED",
    },
  },
});

// Registration is more expensive and abuse-sensitive, so it has a lower hourly cap.
const registerLimiter = createRateLimiter({
  name: "auth-register",
  windowMs: 60 * 60 * 1000,
  limit: 15,
  message: {
    error: {
      message: "Too many registration attempts. Please try again later.",
      code: "REGISTER_RATE_LIMITED",
    },
  },
});

// OTP send/verify endpoints share a tight limiter to reduce SMS abuse and brute force.
const otpLimiter = createRateLimiter({
  name: "auth-otp",
  windowMs: 10 * 60 * 1000,
  limit: 8,
  message: {
    error: {
      message: "Too many OTP attempts. Please try again later.",
      code: "OTP_RATE_LIMITED",
    },
  },
});

// Refresh/logout may run frequently from active browser sessions, but still need
// a ceiling to protect the API from loops or scripted abuse.
const sessionLimiter = createRateLimiter({
  name: "auth-session",
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: {
    error: {
      message: "Too many session requests. Please try again later.",
      code: "SESSION_RATE_LIMITED",
    },
  },
});

const passwordLimiter = createRateLimiter({
  name: "auth-password",
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    error: {
      message: "Too many password requests. Please try again later.",
      code: "PASSWORD_RATE_LIMITED",
    },
  },
});

const verificationLimiter = createRateLimiter({
  name: "auth-verification",
  windowMs: 10 * 60 * 1000,
  limit: 8,
  message: {
    error: {
      message: "Too many verification requests. Please try again later.",
      code: "VERIFICATION_RATE_LIMITED",
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
authRouter.get("/csrf", authController.csrf);
authRouter.post("/register", registerLimiter, authController.register);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.post("/refresh", sessionLimiter, authController.refresh);
authRouter.post("/logout", sessionLimiter, authController.logout);
authRouter.post("/logout-all", sessionLimiter, authenticate, authController.logoutAll);
authRouter.post("/password/forgot", passwordLimiter, authController.forgotPassword);
authRouter.post("/password/reset", passwordLimiter, authController.resetPassword);
authRouter.post(
  "/password/change",
  passwordLimiter,
  authenticate,
  authController.changePassword,
);
authRouter.post(
  "/email/verification/send",
  verificationLimiter,
  authenticate,
  authController.sendEmailVerification,
);
authRouter.post(
  "/email/verification/verify",
  verificationLimiter,
  authController.verifyEmail,
);
authRouter.post(
  "/phone/verification/send",
  otpLimiter,
  authenticate,
  authController.sendPhoneVerification,
);
authRouter.post(
  "/phone/verification/verify",
  otpLimiter,
  authenticate,
  authController.verifyPhone,
);
authRouter.post("/otp/login/send", otpLimiter, authController.sendLoginOtp);
authRouter.post("/otp/login/verify", otpLimiter, authController.verifyLoginOtp);
authRouter.post("/otp/register/send", otpLimiter, authController.sendRegisterOtp);
authRouter.post("/otp/register/verify", otpLimiter, authController.verifyRegisterOtp);
authRouter.post("/google/login", loginLimiter, authController.googleLogin);
authRouter.post("/google/register", registerLimiter, authController.googleRegister);
authRouter.post("/facebook/login", loginLimiter, authController.facebookLogin);
authRouter.post("/facebook/register", registerLimiter, authController.facebookRegister);
