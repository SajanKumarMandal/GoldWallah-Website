import rateLimit from "express-rate-limit";
import { Router } from "express";

import * as authController from "./auth.controller.js";

export const authRouter = Router();

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

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many OTP requests. Please try again later.",
      code: "OTP_SEND_RATE_LIMITED",
    },
  },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many OTP verification attempts. Please try again later.",
      code: "OTP_VERIFY_RATE_LIMITED",
    },
  },
});

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

authRouter.post("/register", registerLimiter, authController.register);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.post("/refresh", sessionLimiter, authController.refresh);
authRouter.post("/logout", sessionLimiter, authController.logout);
authRouter.post("/otp/login/send", otpSendLimiter, authController.sendLoginOtp);
authRouter.post("/otp/login/verify", otpVerifyLimiter, authController.verifyLoginOtp);
authRouter.post("/otp/register/send", otpSendLimiter, authController.sendRegisterOtp);
authRouter.post("/otp/register/verify", otpVerifyLimiter, authController.verifyRegisterOtp);
authRouter.post("/google/login", loginLimiter, authController.googleLogin);
authRouter.post("/google/register", registerLimiter, authController.googleRegister);
authRouter.post("/facebook/login", loginLimiter, authController.facebookLogin);
authRouter.post("/facebook/register", registerLimiter, authController.facebookRegister);
