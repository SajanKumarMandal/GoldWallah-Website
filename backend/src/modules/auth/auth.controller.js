import * as authService from "./auth.service.js";
import {
  facebookLoginSchema,
  facebookRegisterSchema,
  googleLoginSchema,
  googleRegisterSchema,
  loginSchema,
  registerSchema,
  sendOtpSchema,
  validateBody,
  verifyLoginOtpSchema,
  verifyRegisterOtpSchema,
} from "./auth.validation.js";

function sendSuccess(response, result, statusCode = 200) {
  response.status(statusCode).json(result);
}

export async function register(request, response, next) {
  try {
    const payload = validateBody(registerSchema, request.body);
    sendSuccess(response, await authService.registerWithEmail(payload), 201);
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const payload = validateBody(loginSchema, request.body);
    sendSuccess(response, await authService.loginWithEmail(payload));
  } catch (error) {
    next(error);
  }
}

export async function sendLoginOtp(request, response, next) {
  try {
    const payload = validateBody(sendOtpSchema, request.body);
    sendSuccess(response, await authService.sendLoginOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtp(request, response, next) {
  try {
    const payload = validateBody(verifyLoginOtpSchema, request.body);
    sendSuccess(response, await authService.verifyLoginOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function sendRegisterOtp(request, response, next) {
  try {
    const payload = validateBody(sendOtpSchema, request.body);
    sendSuccess(response, await authService.sendRegisterOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function verifyRegisterOtp(request, response, next) {
  try {
    const payload = validateBody(verifyRegisterOtpSchema, request.body);
    sendSuccess(response, await authService.verifyRegisterOtp(payload), 201);
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(request, response, next) {
  try {
    const payload = validateBody(googleLoginSchema, request.body);
    sendSuccess(response, await authService.loginWithGoogle(payload));
  } catch (error) {
    next(error);
  }
}

export async function googleRegister(request, response, next) {
  try {
    const payload = validateBody(googleRegisterSchema, request.body);
    sendSuccess(response, await authService.registerWithGoogle(payload), 201);
  } catch (error) {
    next(error);
  }
}

export async function facebookLogin(request, response, next) {
  try {
    const payload = validateBody(facebookLoginSchema, request.body);
    sendSuccess(response, await authService.loginWithFacebook(payload));
  } catch (error) {
    next(error);
  }
}

export async function facebookRegister(request, response, next) {
  try {
    const payload = validateBody(facebookRegisterSchema, request.body);
    sendSuccess(response, await authService.registerWithFacebook(payload), 201);
  } catch (error) {
    next(error);
  }
}
