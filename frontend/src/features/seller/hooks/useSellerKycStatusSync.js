import { useEffect, useRef } from "react";

import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/context/useAuth";
import { KYC_STATUS } from "@/features/seller/constants/kycStatus";
import { getMySellerKyc } from "@/features/seller/services/sellerKycService";

function resolveStatus(payload) {
  return payload?.submission?.status || payload?.kycStatus || "";
}

export function useSellerKycStatusSync({ intervalMs = 5_000 } = {}) {
  const { accessToken, user, setAuthUser } = useAuth();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const shouldSync =
      accessToken &&
      user?.role === USER_ROLES.seller &&
      user?.kycStatus === KYC_STATUS.pending;

    if (!shouldSync) {
      return undefined;
    }

    let isMounted = true;
    let timerId;

    async function syncKycStatus() {
      if (document.visibilityState === "hidden") {
        timerId = window.setTimeout(syncKycStatus, intervalMs);
        return;
      }

      try {
        const result = await getMySellerKyc(accessToken);
        const nextStatus = resolveStatus(result?.data);
        const currentUser = userRef.current;

        if (
          isMounted &&
          currentUser &&
          nextStatus &&
          nextStatus !== currentUser.kycStatus
        ) {
          setAuthUser({ ...currentUser, kycStatus: nextStatus });
        }
      } catch {
        // Keep the existing session state. Protected API routes still enforce
        // the latest KYC status server-side if this background sync misses.
      } finally {
        if (isMounted) {
          timerId = window.setTimeout(syncKycStatus, intervalMs);
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timerId);
        syncKycStatus();
      }
    }

    timerId = window.setTimeout(syncKycStatus, 2_000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accessToken, intervalMs, setAuthUser, user?.kycStatus, user?.role]);
}
