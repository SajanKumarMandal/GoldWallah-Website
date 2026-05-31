import { useState } from "react";

import JewellerLocationPicker from "@/features/jeweller/components/verification/JewellerLocationPicker";
import JewellerVerificationImageUploader from "@/features/jeweller/components/verification/JewellerVerificationImageUploader";
import { BUSINESS_TYPES } from "@/features/jeweller/constants/jewellerVerificationStatus";
import {
  normalizeJewellerVerificationValues,
  validateJewellerVerification,
} from "@/features/jeweller/utils/jewellerVerificationValidation";

const initialValues = {
  shopName: "",
  ownerName: "",
  businessMobile: "",
  businessEmail: "",
  gstNumber: "",
  shopLicenseNumber: "",
  businessAddress: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  shopOpeningTime: "",
  shopClosingTime: "",
  yearsInBusiness: "",
  businessType: "",
};

const initialImages = {
  shopFrontImage: null,
  gstCertificateImage: null,
  shopLicenseImage: null,
};

function appendIfPresent(formData, key, value) {
  if (value !== "" && value !== null && value !== undefined) {
    formData.append(key, value);
  }
}

function buildFormData(values, images) {
  const data = normalizeJewellerVerificationValues(values);
  const formData = new FormData();

  formData.append("shopName", data.shopName);
  formData.append("ownerName", data.ownerName);
  formData.append("businessMobile", data.businessMobile);
  appendIfPresent(formData, "businessEmail", data.businessEmail);
  appendIfPresent(formData, "gstNumber", data.gstNumber);
  appendIfPresent(formData, "shopLicenseNumber", data.shopLicenseNumber);
  formData.append("businessAddress", data.businessAddress);
  formData.append("city", data.city);
  formData.append("state", data.state);
  formData.append("pincode", data.pincode);
  formData.append("latitude", data.latitude);
  formData.append("longitude", data.longitude);
  appendIfPresent(formData, "shopOpeningTime", data.shopOpeningTime);
  appendIfPresent(formData, "shopClosingTime", data.shopClosingTime);
  appendIfPresent(formData, "yearsInBusiness", data.yearsInBusiness);
  appendIfPresent(formData, "businessType", data.businessType);

  if (images.shopFrontImage?.file) {
    formData.append("shopFrontImage", images.shopFrontImage.file);
  }

  if (images.gstCertificateImage?.file) {
    formData.append("gstCertificateImage", images.gstCertificateImage.file);
  }

  if (images.shopLicenseImage?.file) {
    formData.append("shopLicenseImage", images.shopLicenseImage.file);
  }

  return formData;
}

export default function JewellerBusinessVerificationForm({
  isSubmitting,
  onSubmit,
}) {
  const [values, setValues] = useState(initialValues);
  const [images, setImages] = useState(initialImages);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  function updateField(name, value) {
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setFormError("");
  }

  function updateImage(name, image) {
    setImages((currentImages) => ({ ...currentImages, [name]: image }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const { errors: nextErrors } = validateJewellerVerification(values, {
      shopFrontImage: images.shopFrontImage?.file,
      gstCertificateImage: images.gstCertificateImage?.file,
      shopLicenseImage: images.shopLicenseImage?.file,
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setFormError("");

    try {
      await onSubmit(buildFormData(values, images));
      setValues((currentValues) => ({
        ...currentValues,
        gstNumber: "",
        shopLicenseNumber: "",
      }));
    } catch (error) {
      setFormError(error.message || "Unable to submit business verification.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {formError}
        </p>
      ) : null}

      <FormSection title="Shop Details">
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id="shopName"
            label="Shop name"
            value={values.shopName}
            error={errors.shopName}
            disabled={isSubmitting}
            maxLength={160}
            onChange={(value) => updateField("shopName", value)}
          />
          <Input
            id="ownerName"
            label="Owner name"
            value={values.ownerName}
            error={errors.ownerName}
            disabled={isSubmitting}
            maxLength={160}
            onChange={(value) => updateField("ownerName", value)}
          />
          <Input
            id="businessMobile"
            label="Business mobile"
            value={values.businessMobile}
            error={errors.businessMobile}
            disabled={isSubmitting}
            inputMode="numeric"
            onChange={(value) => updateField("businessMobile", value.replace(/\D/g, ""))}
          />
          <Input
            id="businessEmail"
            label="Business email"
            value={values.businessEmail}
            error={errors.businessEmail}
            disabled={isSubmitting}
            maxLength={255}
            onChange={(value) => updateField("businessEmail", value)}
          />
        </div>
      </FormSection>

      <FormSection
        title="Business Identity"
        description="Provide either GST number or shop license number."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id="gstNumber"
            label="GST number"
            value={values.gstNumber}
            error={errors.gstNumber}
            disabled={isSubmitting}
            onChange={(value) => updateField("gstNumber", value.toUpperCase())}
          />
          <Input
            id="shopLicenseNumber"
            label="Shop license number"
            value={values.shopLicenseNumber}
            error={errors.shopLicenseNumber}
            disabled={isSubmitting}
            maxLength={80}
            onChange={(value) =>
              updateField("shopLicenseNumber", value.toUpperCase())
            }
          />
        </div>
      </FormSection>

      <FormSection title="Business Address">
        <TextArea
          id="businessAddress"
          label="Business address"
          value={values.businessAddress}
          error={errors.businessAddress}
          disabled={isSubmitting}
          maxLength={1000}
          onChange={(value) => updateField("businessAddress", value)}
        />
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Input
            id="city"
            label="City"
            value={values.city}
            error={errors.city}
            disabled={isSubmitting}
            maxLength={100}
            onChange={(value) => updateField("city", value)}
          />
          <Input
            id="state"
            label="State"
            value={values.state}
            error={errors.state}
            disabled={isSubmitting}
            maxLength={100}
            onChange={(value) => updateField("state", value)}
          />
          <Input
            id="pincode"
            label="Pincode"
            value={values.pincode}
            error={errors.pincode}
            disabled={isSubmitting}
            inputMode="numeric"
            onChange={(value) => updateField("pincode", value.replace(/\D/g, ""))}
          />
        </div>
      </FormSection>

      <FormSection title="Location">
        <JewellerLocationPicker
          values={values}
          errors={errors}
          disabled={isSubmitting}
          onChange={updateField}
        />
      </FormSection>

      <FormSection title="Business Timing">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Input
            id="shopOpeningTime"
            label="Opening time"
            value={values.shopOpeningTime}
            error={errors.shopOpeningTime}
            disabled={isSubmitting}
            placeholder="HH:mm"
            onChange={(value) => updateField("shopOpeningTime", value)}
          />
          <Input
            id="shopClosingTime"
            label="Closing time"
            value={values.shopClosingTime}
            error={errors.shopClosingTime}
            disabled={isSubmitting}
            placeholder="HH:mm"
            onChange={(value) => updateField("shopClosingTime", value)}
          />
          <Input
            id="yearsInBusiness"
            label="Years in business"
            value={values.yearsInBusiness}
            error={errors.yearsInBusiness}
            disabled={isSubmitting}
            inputMode="numeric"
            onChange={(value) => updateField("yearsInBusiness", value)}
          />
          <Select
            id="businessType"
            label="Business type"
            value={values.businessType}
            error={errors.businessType}
            disabled={isSubmitting}
            options={BUSINESS_TYPES}
            placeholder="Optional"
            onChange={(value) => updateField("businessType", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Verification Images">
        <JewellerVerificationImageUploader
          images={images}
          errors={errors}
          disabled={isSubmitting}
          onChange={updateImage}
        />
      </FormSection>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.18)] transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {isSubmitting ? "Submitting..." : "Submit for Verification"}
      </button>
    </form>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="min-w-0 rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream)/50 p-4 sm:p-5">
      <div className="mb-5">
        <h3 className="gw-break-text text-lg font-semibold text-(--gw-color-green)">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-(--gw-color-muted)">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Input({ id, label, value, onChange, disabled, error, ...props }) {
  return (
    <label className="block min-w-0" htmlFor={id}>
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
    <label className="block min-w-0" htmlFor={id}>
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

function TextArea({ id, label, value, onChange, disabled, error, ...props }) {
  return (
    <label className="block min-w-0" htmlFor={id}>
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
