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

authRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "auth",
    status: "ready",
    capabilities: [
      "email-password auth",
      "mobile OTP auth",
      "Google OAuth placeholder",
      "Facebook OAuth placeholder",
      "JWT token generation when secrets are configured",
    ],
  });
});

authRouter.post("/register", registerLimiter, authController.register);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.post("/otp/login/send", otpLimiter, authController.sendLoginOtp);
authRouter.post("/otp/login/verify", otpLimiter, authController.verifyLoginOtp);
authRouter.post("/otp/register/send", otpLimiter, authController.sendRegisterOtp);
authRouter.post("/otp/register/verify", otpLimiter, authController.verifyRegisterOtp);
authRouter.post("/google/login", loginLimiter, authController.googleLogin);
authRouter.post("/google/register", registerLimiter, authController.googleRegister);
authRouter.post("/facebook/login", loginLimiter, authController.facebookLogin);
authRouter.post("/facebook/register", registerLimiter, authController.facebookRegister);
