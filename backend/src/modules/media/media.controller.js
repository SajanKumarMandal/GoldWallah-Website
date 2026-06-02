import { resolvePrivateMediaRequest } from "./privateMedia.service.js";

function requestMeta(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent") || null,
    requestId: request.requestId || request.id || null,
  };
}

export async function privateMedia(request, response, next) {
  try {
    const media = await resolvePrivateMediaRequest({
      scope: request.params.scope,
      filename: request.params.filename,
      token: request.query.token,
      requestMeta: requestMeta(request),
    });

    const headers = {
      "Cache-Control": "private, no-store",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
    };

    if (media.redirectUrl) {
      response.set(headers);
      response.redirect(302, media.redirectUrl);
      return;
    }

    response.sendFile(media.filename, {
      root: media.root,
      dotfiles: "deny",
      headers,
    });
  } catch (error) {
    next(error);
  }
}
