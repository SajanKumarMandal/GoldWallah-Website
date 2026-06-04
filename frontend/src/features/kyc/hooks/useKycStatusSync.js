import { useEffect, useRef } from "react";

import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/context/useAuth";
import { getMyJewellerKyc } from "@/features/jeweller/services/jewellerKycService";
import { KYC_STATUS } from "@/features/seller/constants/kycStatus";
import { getMySellerKyc } from "@/features/seller/services/sellerKycService";

function resolveStatus(payload) {
  return payload?.submission?.status || payload?.kycStatus || "";
}

export function useKycStatusSync({ enabled = true, intervalMs = 30_000 } = {}) {
  const { accessToken, user, setAuthUser } = useAuth();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const shouldSync =
      enabled &&
      accessToken &&
      [USER_ROLES.seller, USER_ROLES.jeweller].includes(user?.role) &&
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
        const getMyKyc =
          userRef.current?.role === USER_ROLES.jeweller
            ? getMyJewellerKyc
            : getMySellerKyc;
        const result = await getMyKyc(accessToken);
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
        // Protected API routes still enforce the latest KYC state server-side.
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

    timerId = window.setTimeout(syncKycStatus, intervalMs);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accessToken, enabled, intervalMs, setAuthUser, user?.kycStatus, user?.role]);
}
