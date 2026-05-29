import {
  deleteListingFiles,
  getListingFileUrl,
  getUploadedListingImageFiles,
  uploadListingImages,
  validateListingImageFiles,
} from "./listings.upload.js";
import {
  createListingSchema,
  listingStatusQuerySchema,
  updateListingSchema,
  uuidParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from "./listings.validation.js";
import {
  cancelSellerListing,
  createSellerListing,
  getMySellerListings,
  getSellerListingDetail,
  updateSellerListing,
} from "./listings.service.js";

export { uploadListingImages };

function getImageUrls(request, files) {
  return files.map((file) => getListingFileUrl(request, file));
}

async function cleanupUploadedFiles(request) {
  const files = getUploadedListingImageFiles(request);
  if (files.length > 0) {
    try {
      await deleteListingFiles(files);
    } catch (error) {
      request.log.warn({ error }, "Failed to clean up uploaded listing files");
    }
  }
}

export async function createListing(request, response, next) {
  try {
    const payload = validateBody(createListingSchema, request.body);
    const files = getUploadedListingImageFiles(request);

    await validateListingImageFiles(files, { required: true });

    const result = await createSellerListing({
      user: request.user,
      payload,
      imageUrls: getImageUrls(request, files),
    });

    response.status(201).json(result);
  } catch (error) {
    await cleanupUploadedFiles(request);
    next(error);
  }
}

export async function myListings(request, response, next) {
  try {
    const filters = validateQuery(listingStatusQuerySchema, request.query);

    response.status(200).json(
      await getMySellerListings({
        user: request.user,
        filters,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function listingDetail(request, response, next) {
  try {
    const { listingId } = validateParams(uuidParamSchema, request.params);

    response.status(200).json(
      await getSellerListingDetail({
        user: request.user,
        listingId,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function updateListing(request, response, next) {
  try {
    const { listingId } = validateParams(uuidParamSchema, request.params);
    const payload = validateBody(updateListingSchema, request.body);
    const files = getUploadedListingImageFiles(request);
    const shouldReplaceImages = files.length > 0;

    await validateListingImageFiles(files, { required: false });

    const result = await updateSellerListing({
      user: request.user,
      listingId,
      payload,
      imageUrls: shouldReplaceImages ? getImageUrls(request, files) : null,
    });

    if (result.oldImages?.length > 0) {
      deleteListingFiles(result.oldImages).catch((error) => {
        request.log.warn({ error }, "Failed to delete replaced listing images");
      });
    }

    response.status(200).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    await cleanupUploadedFiles(request);
    next(error);
  }
}

export async function cancelListing(request, response, next) {
  try {
    const { listingId } = validateParams(uuidParamSchema, request.params);

    response.status(200).json(
      await cancelSellerListing({
        user: request.user,
        listingId,
      }),
    );
  } catch (error) {
    next(error);
  }
}
