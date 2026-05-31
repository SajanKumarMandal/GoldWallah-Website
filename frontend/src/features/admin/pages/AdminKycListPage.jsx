import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import { listSellerKycSubmissions } from "@/features/admin/services/adminKycService";

const statusTabs = ["PENDING", "APPROVED", "REJECTED"];

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminKycListPage() {
  const { accessToken } = useOutletContext();
  const location = useLocation();
  const [activeStatus, setActiveStatus] = useState("PENDING");
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissions() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await listSellerKycSubmissions({
          accessToken,
          status: activeStatus,
        });

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
  }, [accessToken, activeStatus, location.state?.refreshedAt]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Admin review"
        title="Seller KYC submissions"
        description="Review seller identity submissions and open detail view only when full identity verification is required."
      />

      <DashboardSection title="KYC queue" description="List view shows only safe identity details.">
        <div className="mb-5 grid gap-2 min-[420px]:flex min-[420px]:flex-wrap">
          {statusTabs.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                activeStatus === status
                  ? "bg-(--gw-color-green) text-(--gw-color-cream)"
                  : "border border-(--gw-color-border) bg-white text-(--gw-color-green) hover:border-(--gw-color-gold)"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading KYC submissions...
          </p>
        ) : null}

        {!isLoading && submissions.length === 0 ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            No {activeStatus.toLowerCase()} submissions.
          </p>
        ) : null}

        {!isLoading && submissions.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-(--gw-color-border)">
            <div className="overflow-x-auto">
              <table className="min-w-[54rem] divide-y divide-(--gw-color-border) text-left text-sm">
                <thead className="bg-(--gw-color-cream)">
                  <tr className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Aadhaar</th>
                    <th className="px-4 py-3">PAN</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--gw-color-border) bg-white">
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="gw-break-text px-4 py-3 font-semibold text-(--gw-color-green)">
                        {submission.fullName || "Not available"}
                      </td>
                      <td className="px-4 py-3 text-(--gw-color-muted)">
                        {submission.mobileNumber || "Not available"}
                      </td>
                      <td className="px-4 py-3 text-(--gw-color-muted)">
                        ****{submission.aadhaarLast4 || "----"}
                      </td>
                      <td className="px-4 py-3 text-(--gw-color-muted)">
                        ******{submission.panLast4 || "----"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-(--gw-color-green)">
                        {submission.status}
                      </td>
                      <td className="px-4 py-3 text-(--gw-color-muted)">
                        {formatDate(submission.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={ROUTES.adminKycDetail.replace(":kycId", submission.id)}
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-(--gw-color-green) px-3 text-xs font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </DashboardSection>
    </div>
  );
}
