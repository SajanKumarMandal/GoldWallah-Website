import { useState } from "react";

import ListingImageUploader from "@/features/seller/components/listings/ListingImageUploader";
import ListingLocationFields from "@/features/seller/components/listings/ListingLocationFields";

const GOLD_TYPES = ["JEWELLERY", "COIN", "BAR", "SCRAP", "OTHER"];
const PURITIES = ["24K", "22K", "18K", "14K", "UNKNOWN"];
const CONDITIONS = ["NEW", "USED", "DAMAGED", "OLD", "UNKNOWN"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const initialValues = {
  title: "",
  goldType: "",
  purity: "",
  weightGrams: "",
  expectedPrice: "",
  description: "",
  condition: "",
  hallmarkAvailable: false,
  billAvailable: false,
  purchaseYear: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
};

function toFormValues(listing) {
  if (!listing) {
    return initialValues;
  }

  return {
    title: listing.title || "",
    goldType: listing.goldType || "",
    purity: listing.purity || "",
    weightGrams: listing.weightGrams === null ? "" : String(listing.weightGrams),
    expectedPrice: listing.expectedPrice === null ? "" : String(listing.expectedPrice),
    description: listing.description || "",
    condition: listing.condition || "",
    hallmarkAvailable: Boolean(listing.hallmarkAvailable),
    billAvailable: Boolean(listing.billAvailable),
    purchaseYear: listing.purchaseYear === null ? "" : String(listing.purchaseYear),
    city: listing.city || "",
    state: listing.state || "",
    latitude: listing.latitude === null ? "" : String(listing.latitude),
    longitude: listing.longitude === null ? "" : String(listing.longitude),
  };
}

function validate(values, images, mode) {
  const errors = {};
  const currentYear = new Date().getFullYear();
  const title = values.title.trim();
  const city = values.city.trim();
  const state = values.state.trim();
  const description = values.description.trim();
  const weightGrams = Number(values.weightGrams);
  const expectedPrice = Number(values.expectedPrice);
  const latitude = Number(values.latitude);
  const longitude = Number(values.longitude);

  if (title.length < 3) {
    errors.title = "Title must be at least 3 characters.";
  } else if (title.length > 160) {
    errors.title = "Title must be 160 characters or fewer.";
  }

  if (!GOLD_TYPES.includes(values.goldType)) {
    errors.goldType = "Select a valid gold type.";
  }

  if (!PURITIES.includes(values.purity)) {
    errors.purity = "Select a valid purity.";
  }

  if (!values.weightGrams || !Number.isFinite(weightGrams) || weightGrams <= 0) {
    errors.weightGrams = "Weight must be greater than 0.";
  }

  if (
    values.expectedPrice &&
    (!Number.isFinite(expectedPrice) || expectedPrice <= 0)
  ) {
    errors.expectedPrice = "Expected price must be greater than 0.";
  }

  if (description.length > 2000) {
    errors.description = "Description must be 2000 characters or fewer.";
  }

  if (values.condition && !CONDITIONS.includes(values.condition)) {
    errors.condition = "Select a valid condition.";
  }

  if (
    values.purchaseYear &&
    (Number(values.purchaseYear) < 1900 ||
      Number(values.purchaseYear) > currentYear ||
      !Number.isInteger(Number(values.purchaseYear)))
  ) {
    errors.purchaseYear = `Purchase year must be between 1900 and ${currentYear}.`;
  }

  if (!city) {
    errors.city = "City is required.";
  } else if (city.length > 100) {
    errors.city = "City must be 100 characters or fewer.";
  }

  if (!state) {
    errors.state = "State is required.";
  } else if (state.length > 100) {
    errors.state = "State must be 100 characters or fewer.";
  }

  if (
    values.latitude &&
    (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
  ) {
    errors.latitude = "Latitude must be between -90 and 90.";
  }

  if (
    values.longitude &&
    (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
  ) {
    errors.longitude = "Longitude must be between -180 and 180.";
  }

  if (mode === "create" && images.length === 0) {
    errors.listingImages = "At least one listing image is required.";
  }

  if (images.length > 5) {
    errors.listingImages = "A maximum of 5 images is allowed.";
  }

  for (const image of images) {
    if (!ALLOWED_IMAGE_TYPES.includes(image.file.type)) {
      errors.listingImages = "Only JPEG, PNG, and WebP images are allowed.";
      break;
    }

    if (image.file.size > MAX_IMAGE_SIZE) {
      errors.listingImages = "Each image must be 5MB or smaller.";
      break;
    }
  }

  return errors;
}

function appendIfPresent(formData, key, value) {
  if (value !== "" && value !== null && value !== undefined) {
    formData.append(key, value);
  }
}

function buildFormData(values, images) {
  const formData = new FormData();

  formData.append("title", values.title.trim());
  formData.append("goldType", values.goldType);
  formData.append("purity", values.purity);
  formData.append("weightGrams", values.weightGrams);
  appendIfPresent(formData, "expectedPrice", values.expectedPrice);
  appendIfPresent(formData, "description", values.description.trim());
  appendIfPresent(formData, "condition", values.condition);
  formData.append("hallmarkAvailable", String(values.hallmarkAvailable));
  formData.append("billAvailable", String(values.billAvailable));
  appendIfPresent(formData, "purchaseYear", values.purchaseYear);
  formData.append("city", values.city.trim());
  formData.append("state", values.state.trim());
  appendIfPresent(formData, "latitude", values.latitude);
  appendIfPresent(formData, "longitude", values.longitude);

  images.forEach((image) => {
    formData.append("listingImages", image.file);
  });

  return formData;
}

export default function ListingForm({
  mode = "create",
  initialListing = null,
  existingImages = [],
  isSubmitting,
  submitLabel = "Create listing",
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(() => toFormValues(initialListing));
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});

  function updateField(name, value) {
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
  }

  function updateImages(nextImages) {
    setImages(nextImages);
    setErrors((currentErrors) => ({ ...currentErrors, listingImages: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values, images, mode);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit(buildFormData(values, images));
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <Input
          id="title"
          label="Title"
          value={values.title}
          error={errors.title}
          disabled={isSubmitting}
          maxLength={160}
          onChange={(value) => updateField("title", value)}
        />
        <Input
          id="weightGrams"
          label="Weight in grams"
          value={values.weightGrams}
          error={errors.weightGrams}
          disabled={isSubmitting}
          inputMode="decimal"
          onChange={(value) => updateField("weightGrams", value)}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Select
          id="goldType"
          label="Gold type"
          value={values.goldType}
          error={errors.goldType}
          disabled={isSubmitting}
          options={GOLD_TYPES}
          placeholder="Select type"
          onChange={(value) => updateField("goldType", value)}
        />
        <Select
          id="purity"
          label="Purity"
          value={values.purity}
          error={errors.purity}
          disabled={isSubmitting}
          options={PURITIES}
          placeholder="Select purity"
          onChange={(value) => updateField("purity", value)}
        />
        <Select
          id="condition"
          label="Condition"
          value={values.condition}
          error={errors.condition}
          disabled={isSubmitting}
          options={CONDITIONS}
          placeholder="Optional"
          onChange={(value) => updateField("condition", value)}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          id="expectedPrice"
          label="Expected price"
          value={values.expectedPrice}
          error={errors.expectedPrice}
          disabled={isSubmitting}
          inputMode="decimal"
          onChange={(value) => updateField("expectedPrice", value)}
        />
        <Input
          id="purchaseYear"
          label="Purchase year"
          value={values.purchaseYear}
          error={errors.purchaseYear}
          disabled={isSubmitting}
          inputMode="numeric"
          onChange={(value) => updateField("purchaseYear", value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Checkbox
          id="hallmarkAvailable"
          label="Hallmark available"
          checked={values.hallmarkAvailable}
          disabled={isSubmitting}
          onChange={(checked) => updateField("hallmarkAvailable", checked)}
        />
        <Checkbox
          id="billAvailable"
          label="Bill available"
          checked={values.billAvailable}
          disabled={isSubmitting}
          onChange={(checked) => updateField("billAvailable", checked)}
        />
      </div>

      <TextArea
        id="description"
        label="Description"
        value={values.description}
        error={errors.description}
        disabled={isSubmitting}
        maxLength={2000}
        onChange={(value) => updateField("description", value)}
      />

      <ListingLocationFields
        values={values}
        errors={errors}
        disabled={isSubmitting}
        onChange={updateField}
      />

      <ListingImageUploader
        images={images}
        existingImages={existingImages}
        required={mode === "create"}
        error={errors.listingImages}
        disabled={isSubmitting}
        onChange={updateImages}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.18)] transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Submitting..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-6 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Input({ id, label, value, onChange, disabled, error, ...props }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold text-(--gw-color-green)">{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm text-(--gw-color-green) outline-none transition focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35"
        {...props}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function Select({ id, label, value, onChange, disabled, error, options, placeholder }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold text-(--gw-color-green)">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm text-(--gw-color-green) outline-none transition focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function Checkbox({ id, label, checked, onChange, disabled }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm font-semibold text-(--gw-color-green)"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-(--gw-color-green)"
      />
      {label}
    </label>
  );
}

function TextArea({ id, label, value, onChange, disabled, error, ...props }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold text-(--gw-color-green)">{label}</span>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-none rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm text-(--gw-color-green) outline-none transition focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35"
        {...props}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function FieldError({ message }) {
  return <p className="mt-2 text-xs font-medium text-(--gw-color-copper)">{message}</p>;
}
