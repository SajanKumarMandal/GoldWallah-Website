import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { validateVerificationImage } from "@/features/jeweller/utils/jewellerVerificationValidation";

function createImageState(file) {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export default function JewellerVerificationImageUploader({
  images,
  errors,
  disabled,
  onChange,
}) {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      <UploadCard
        fieldName="shopFrontImage"
        title="Shop front image"
        required
        image={images.shopFrontImage}
        error={errors.shopFrontImage}
        disabled={disabled}
        onChange={onChange}
      />
      <UploadCard
        fieldName="gstCertificateImage"
        title="GST certificate image"
        image={images.gstCertificateImage}
        error={errors.gstCertificateImage}
        disabled={disabled}
        onChange={onChange}
      />
      <UploadCard
        fieldName="shopLicenseImage"
        title="Shop license image"
        image={images.shopLicenseImage}
        error={errors.shopLicenseImage}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

function UploadCard({ fieldName, title, required, image, error, disabled, onChange }) {
  const [localError, setLocalError] = useState("");
  const objectUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }
    };
  }, []);

  function replaceImage(nextImage) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }

    if (nextImage?.previewUrl) {
      objectUrlRef.current = nextImage.previewUrl;
    }

    onChange(fieldName, nextImage);
  }

  function handleSelected(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setLocalError("");

    if (!file) {
      return;
    }

    const validationError = validateVerificationImage(file, { required });

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    replaceImage(createImageState(file));
  }

  function removeImage() {
    setLocalError("");
    replaceImage(null);
  }

  const visibleError = error || localError;

  return (
    <div className="min-w-0 rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream)/60 p-4">
      <div>
        <p className="gw-break-text text-sm font-semibold text-(--gw-color-green)">
          {title} {required ? "" : "(optional)"}
        </p>
        <p className="mt-1 text-xs text-(--gw-color-muted)">
          JPEG, PNG, or WebP. Max 5MB.
        </p>
      </div>

      {image ? (
        <div className="relative mt-4">
          <img
            src={image.previewUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full rounded-2xl border border-(--gw-color-border) object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            disabled={disabled}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-(--gw-color-copper) shadow transition hover:bg-(--gw-color-copper)/10 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label
          className={`mt-4 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-(--gw-color-border) bg-white text-center transition ${
            disabled
              ? "pointer-events-none opacity-60"
              : "hover:border-(--gw-color-gold)"
          }`}
        >
          <ImagePlus className="h-7 w-7 text-(--gw-color-gold)" aria-hidden="true" />
          <span className="mt-2 text-sm font-semibold text-(--gw-color-green)">
            Select image
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={handleSelected}
            className="sr-only"
          />
        </label>
      )}

      {image ? (
        <label className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) sm:w-auto">
          Reselect
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={handleSelected}
            className="sr-only"
          />
        </label>
      ) : null}

      {visibleError ? (
        <p className="mt-3 text-xs font-medium text-(--gw-color-copper)">
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
