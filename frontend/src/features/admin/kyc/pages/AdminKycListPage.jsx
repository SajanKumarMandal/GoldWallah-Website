import { Eye, FileCheck2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { getSellerKycSubmissions } from "@/features/admin/kyc/services/adminKycService";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function detailPath(kycId) {
  return ROUTES.adminKycDetail.replace(":kycId", kycId);
}

export default function AdminKycListPage() {
  const { accessToken } = useOutletContext();
  const [status, setStatus] = useState("PENDING");
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissions() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getSellerKycSubmissions(accessToken, status ? { status } : {});

        if (isMounted) {
          setSubmissions(result?.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load seller KYC submissions.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSubmissions();

    return () => {
      isMounted = false;
    };
  }, [accessToken, status]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--gw-color-muted)">
              Seller verification
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-(--gw-color-green)">
              Seller KYC review
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-(--gw-color-muted)">
              Review seller KYC submissions, inspect submitted details, and approve or reject pending requests.
            </p>
          </div>

          <label className="min-w-0 text-sm font-semibold text-(--gw-color-green)">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 h-11 rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none focus:border-(--gw-color-gold)"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      <section className="rounded-3xl border border-(--gw-color-border) bg-white p-4 shadow-sm sm:p-5">
        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading KYC submissions...
          </p>
        ) : null}

        {!isLoading && submissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--gw-color-border) bg-(--gw-color-cream)/55 p-6 text-center">
            <FileCheck2 className="mx-auto h-8 w-8 text-(--gw-color-gold)" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-(--gw-color-green)">
              No KYC submissions found
            </h2>
            <p className="mt-1 text-sm text-(--gw-color-muted)">
              Seller submissions matching this filter will appear here.
            </p>
          </div>
        ) : null}

        {!isLoading && submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--gw-color-border) text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.14em] text-(--gw-color-muted)">
                  <th className="px-3 py-3 font-semibold">Seller</th>
                  <th className="px-3 py-3 font-semibold">Mobile</th>
                  <th className="px-3 py-3 font-semibold">Aadhaar</th>
                  <th className="px-3 py-3 font-semibold">PAN</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Submitted</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--gw-color-border)">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="align-top">
                    <td className="px-3 py-4 font-semibold text-(--gw-color-green)">
                      {submission.fullName || "—"}
                    </td>
                    <td className="px-3 py-4 text-(--gw-color-muted)">
                      {submission.mobileNumber || "—"}
                    </td>
                    <td className="px-3 py-4 text-(--gw-color-muted)">
                      ****{submission.aadhaarLast4 || "—"}
                    </td>
                    <td className="px-3 py-4 text-(--gw-color-muted)">
                      ****{submission.panLast4 || "—"}
                    </td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-(--gw-color-cream) px-3 py-1 text-xs font-semibold text-(--gw-color-green)">
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-(--gw-color-muted)">
                      {formatDate(submission.createdAt)}
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        to={detailPath(submission.id)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-(--gw-color-green) px-4 text-xs font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
