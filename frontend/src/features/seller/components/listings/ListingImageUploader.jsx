import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "Each image must be 5MB or smaller.";
  }

  return "";
}

export default function ListingImageUploader({
  images,
  onChange,
  error,
  disabled,
  required = false,
  existingImages = [],
}) {
  const [localError, setLocalError] = useState("");
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  function revokeRemovedUrls(nextImages) {
    const nextUrls = new Set(nextImages.map((image) => image.previewUrl));
    objectUrlsRef.current = objectUrlsRef.current.filter((url) => {
      if (nextUrls.has(url)) {
        return true;
      }

      URL.revokeObjectURL(url);
      return false;
    });
  }

  function updateImages(nextImages) {
    revokeRemovedUrls(nextImages);
    onChange(nextImages);
  }

  function handleFilesSelected(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    setLocalError("");

    if (images.length + selectedFiles.length > MAX_IMAGES) {
      setLocalError("You can upload a maximum of 5 listing images.");
      return;
    }

    const nextImages = [];
    const nextObjectUrls = [];

    for (const file of selectedFiles) {
      const validationError = validateFile(file);

      if (validationError) {
        nextObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        setLocalError(validationError);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      nextObjectUrls.push(previewUrl);
      nextImages.push({ file, previewUrl });
    }

    objectUrlsRef.current.push(...nextObjectUrls);
    updateImages([...images, ...nextImages]);
  }

  function removeImage(index) {
    updateImages(images.filter((_image, imageIndex) => imageIndex !== index));
    setLocalError("");
  }

  const visibleError = error || localError;

  return (
    <div className="rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream)/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-(--gw-color-green)">
            Listing images {required ? "" : "(optional replacement)"}
          </p>
          <p className="mt-1 text-xs text-(--gw-color-muted)">
            {images.length} of {MAX_IMAGES} selected
          </p>
        </div>
        <label
          className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${
            disabled || images.length >= MAX_IMAGES
              ? "pointer-events-none bg-(--gw-color-border) text-(--gw-color-muted)"
              : "bg-(--gw-color-green) text-(--gw-color-cream) hover:bg-(--gw-color-green-soft)"
          }`}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Select images
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled || images.length >= MAX_IMAGES}
            onChange={handleFilesSelected}
            className="sr-only"
          />
        </label>
      </div>

      {existingImages.length > 0 && images.length === 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--gw-color-muted)">
            Current images
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {existingImages.map((image) => (
              <img
                key={image.id || image.imageUrl}
                src={image.imageUrl}
                alt=""
                className="aspect-square rounded-2xl border border-(--gw-color-border) object-cover"
              />
            ))}
          </div>
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((image, index) => (
            <div key={image.previewUrl} className="relative">
              <img
                src={image.previewUrl}
                alt={`Selected listing ${index + 1}`}
                className="aspect-square w-full rounded-2xl border border-(--gw-color-border) object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={disabled}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-(--gw-color-copper) shadow transition hover:bg-(--gw-color-copper)/10 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Remove image"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {visibleError ? (
        <p className="mt-3 text-xs font-medium text-(--gw-color-copper)">
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
