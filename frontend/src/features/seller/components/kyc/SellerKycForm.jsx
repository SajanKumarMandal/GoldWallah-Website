import { useEffect, useRef, useState } from "react";

import SelfieCameraCapture from "@/features/seller/components/kyc/SelfieCameraCapture";
import {
  buildSellerKycFormData,
  normalizeKycField,
  validateSellerKycForm,
} from "@/features/seller/utils/kycValidation";

const initialValues = {
  fullName: "",
  mobileNumber: "",
  addressAsPerAadhaar: "",
  aadhaarNumber: "",
  panNumber: "",
  selfieImage: null,
  selfiePreviewUrl: "",
  selfieCapturedAt: "",
};

export default function SellerKycForm({
  initialDetails,
  isSubmitting,
  contextLabel = "Seller",
  onSubmit,
}) {
  const [values, setValues] = useState({
    ...initialValues,
    fullName: initialDetails?.fullName || "",
    mobileNumber: initialDetails?.mobileNumber || "",
    addressAsPerAadhaar: initialDetails?.addressAsPerAadhaar || "",
  });
  const [errors, setErrors] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [selfieResetKey, setSelfieResetKey] = useState(0);
  const formMessageRef = useRef(null);
  const selfiePreviewUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (selfiePreviewUrlRef.current) {
        URL.revokeObjectURL(selfiePreviewUrlRef.current);
      }
    };
  }, []);

  function updateField(name, value) {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: normalizeKycField(name, value),
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setFormMessage("");
  }

  function clearSelfiePreviewUrl(nextPreviewUrl = "") {
    if (
      selfiePreviewUrlRef.current &&
      selfiePreviewUrlRef.current !== nextPreviewUrl
    ) {
      URL.revokeObjectURL(selfiePreviewUrlRef.current);
    }

    selfiePreviewUrlRef.current = nextPreviewUrl;
  }

  function updateSelfie({ file, previewUrl, capturedAt }) {
    const nextPreviewUrl = file ? previewUrl : "";
    clearSelfiePreviewUrl(nextPreviewUrl);
    setValues((currentValues) => ({
      ...currentValues,
      selfieImage: file,
      selfiePreviewUrl: nextPreviewUrl,
      selfieCapturedAt: file ? capturedAt : "",
    }));
    setErrors((currentErrors) => ({ ...currentErrors, selfieImage: "" }));
    setFormMessage("");
  }

  function focusFormMessage() {
    window.requestAnimationFrame(() => {
      formMessageRef.current?.focus();
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateSellerKycForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormMessage("Please fix the highlighted KYC details before submitting.");
      focusFormMessage();
      if (import.meta.env.DEV) {
        console.debug(`${contextLabel} KYC validation failed`, {
          fields: Object.keys(nextErrors),
        });
      }
      return;
    }

    try {
      setFormMessage(`${contextLabel} KYC is being submitted securely...`);
      await onSubmit(buildSellerKycFormData(values));
    } catch (error) {
      setFormMessage(error.message || `Unable to submit ${contextLabel.toLowerCase()} KYC.`);
      focusFormMessage();
      return;
    }

    setFormMessage("");
    setValues((currentValues) => ({
      ...currentValues,
      aadhaarNumber: "",
      panNumber: "",
      selfieImage: null,
      selfiePreviewUrl: "",
      selfieCapturedAt: "",
    }));
    clearSelfiePreviewUrl();
    setSelfieResetKey((currentKey) => currentKey + 1);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formMessage ? (
        <p
          ref={formMessageRef}
          tabIndex={-1}
          aria-live="polite"
          className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper) outline-none focus-visible:ring-4 focus-visible:ring-(--gw-color-copper)/15"
        >
          {formMessage}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <KycInput
          id="fullName"
          label="Full name"
          value={values.fullName}
          error={errors.fullName}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.fullName)}
          maxLength={150}
          onChange={(value) => updateField("fullName", value)}
        />
        <KycInput
          id="mobileNumber"
          label="Mobile number"
          value={values.mobileNumber}
          error={errors.mobileNumber}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.mobileNumber)}
          inputMode="numeric"
          maxLength={10}
          onChange={(value) => updateField("mobileNumber", value)}
        />
      </div>

      <KycTextArea
        id="addressAsPerAadhaar"
        label="Address as per Aadhaar"
        value={values.addressAsPerAadhaar}
        error={errors.addressAsPerAadhaar}
        disabled={isSubmitting}
        aria-invalid={Boolean(errors.addressAsPerAadhaar)}
        onChange={(value) => updateField("addressAsPerAadhaar", value)}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <KycInput
          id="aadhaarNumber"
          label="Aadhaar number"
          value={values.aadhaarNumber}
          error={errors.aadhaarNumber}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.aadhaarNumber)}
          inputMode="numeric"
          maxLength={12}
          placeholder="12 digit number"
          onChange={(value) => updateField("aadhaarNumber", value)}
        />
        <KycInput
          id="panNumber"
          label="PAN number"
          value={values.panNumber}
          error={errors.panNumber}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.panNumber)}
          maxLength={10}
          placeholder="ABCDE1234F"
          onChange={(value) => updateField("panNumber", value)}
        />
      </div>

      <SelfieCameraCapture
        key={selfieResetKey}
        error={errors.selfieImage}
        disabled={isSubmitting}
        previewUrl={values.selfiePreviewUrl}
        capturedAt={values.selfieCapturedAt}
        onChange={updateSelfie}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.18)] transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {isSubmitting ? "Submitting..." : "Submit KYC"}
      </button>
    </form>
  );
}

function KycInput({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  type = "text",
  placeholder = "",
  ...props
}) {
  const errorId = `${id}-error`;

  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="text-sm font-semibold text-(--gw-color-green)">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm text-(--gw-color-green) outline-none transition placeholder:text-(--gw-color-muted)/55 focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35"
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-2 text-xs font-medium text-(--gw-color-copper)">{error}</p>
      ) : null}
    </label>
  );
}

function KycTextArea({ id, label, value, onChange, disabled, error, ...props }) {
  const errorId = `${id}-error`;

  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="text-sm font-semibold text-(--gw-color-green)">{label}</span>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        required
        aria-describedby={error ? errorId : undefined}
        rows={4}
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-none rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm text-(--gw-color-green) outline-none transition placeholder:text-(--gw-color-muted)/55 focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35"
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-2 text-xs font-medium text-(--gw-color-copper)">{error}</p>
      ) : null}
    </label>
  );
}
