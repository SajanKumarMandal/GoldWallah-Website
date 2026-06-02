import {
  acceptSellerBid,
  getMyJewellerBids,
  getSellerListingBids,
  placeBid,
  rejectSellerBid,
} from "./bids.service.js";
import {
  createBidSchema,
  listBidsQuerySchema,
  uuidParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from "./bids.validation.js";

function requestMeta(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent") || null,
  };
}

export async function createBid(request, response, next) {
  try {
    const payload = validateBody(createBidSchema, request.body);

    response.status(201).json(
      await placeBid({
        user: request.user,
        payload,
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function createBidForListing(request, response, next) {
  try {
    const { listingId } = validateParams(uuidParamSchema, request.params);
    const payload = validateBody(createBidSchema, {
      ...request.body,
      listingId,
    });

    response.status(201).json(
      await placeBid({
        user: request.user,
        payload,
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function myBids(request, response, next) {
  try {
    const query = validateQuery(listBidsQuerySchema, request.query);
    response.status(200).json(await getMyJewellerBids(request.user, query));
  } catch (error) {
    next(error);
  }
}

export async function listingBids(request, response, next) {
  try {
    const { listingId } = validateParams(uuidParamSchema, request.params);
    const query = validateQuery(listBidsQuerySchema, request.query);
    response.status(200).json(
      await getSellerListingBids({
        user: request.user,
        listingId,
        query,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function acceptBid(request, response, next) {
  try {
    const { bidId } = validateParams(uuidParamSchema, request.params);
    response.status(200).json(
      await acceptSellerBid({
        user: request.user,
        bidId,
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function rejectBid(request, response, next) {
  try {
    const { bidId } = validateParams(uuidParamSchema, request.params);
    response.status(200).json(
      await rejectSellerBid({
        user: request.user,
        bidId,
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}
