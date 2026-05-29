import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function formatCapturedAt(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SelfieCameraCapture({
  error,
  disabled,
  previewUrl,
  capturedAt,
  onChange,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      const playPromise = videoRef.current.play();

      if (playPromise?.catch) {
        playPromise.catch(() => {
          setCameraError("Camera preview is not ready yet.");
        });
      }
    }
  }, [isCameraOpen]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
  }

  async function openCamera() {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera capture is not supported on this browser.");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (caughtError) {
      const errorName = caughtError?.name || "";

      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setCameraError("Camera permission is required for KYC selfie verification.");
        return;
      }

      if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        setCameraError("No camera was found on this device.");
        return;
      }

      setCameraError("Unable to open camera. Please check your camera and try again.");
    }
  }

  function closeCamera() {
    stopCamera();
  }

  function captureSelfie() {
    const video = videoRef.current;

    if (!video) {
      setCameraError("Camera preview is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture selfie. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Unable to capture selfie. Please try again.");
          return;
        }

        const selfieFile = new File([blob], "selfieImage.jpg", {
          type: "image/jpeg",
        });
        const nextPreviewUrl = URL.createObjectURL(selfieFile);
        onChange({
          file: selfieFile,
          previewUrl: nextPreviewUrl,
          capturedAt: new Date().toISOString(),
        });
        stopCamera();
      },
      "image/jpeg",
      0.92,
    );
  }

  async function retakeSelfie() {
    onChange({
      file: null,
      previewUrl: "",
      capturedAt: "",
    });
    stopCamera();
    await openCamera();
  }

  const visibleError = error || cameraError;

  return (
    <div>
      <div className="rounded-3xl border border-dashed border-(--gw-color-border) bg-(--gw-color-cream)/70 p-4">
        <div className="overflow-hidden rounded-2xl bg-(--gw-color-green)">
          {isCameraOpen ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
          ) : previewUrl ? (
            <div>
              <img
                src={previewUrl}
                alt="Captured selfie preview"
                className="aspect-video w-full object-cover"
              />
              <div className="bg-white px-4 py-3 text-(--gw-color-green)">
                <p className="text-sm font-semibold">Captured selfie preview</p>
                {capturedAt ? (
                  <p className="mt-1 text-xs text-(--gw-color-muted)">
                    Captured {formatCapturedAt(capturedAt)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center text-(--gw-color-cream)">
              <Camera className="h-10 w-10 text-(--gw-color-gold)" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Camera selfie required</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {!isCameraOpen && !previewUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={openCamera}
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
            >
              Open Camera
            </button>
          ) : null}
          {isCameraOpen ? (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={captureSelfie}
                className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-gold) px-5 text-sm font-semibold text-(--gw-color-green) transition hover:bg-[#e0ad62] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Capture Selfie
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={closeCamera}
                className="inline-flex h-11 items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-5 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
              >
                Close Camera
              </button>
            </>
          ) : null}
          {previewUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={retakeSelfie}
              className="inline-flex h-11 items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-5 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
            >
              Retake Selfie
            </button>
          ) : null}
        </div>
      </div>
      {visibleError ? (
        <p className="mt-2 text-xs font-medium text-(--gw-color-copper)">
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
