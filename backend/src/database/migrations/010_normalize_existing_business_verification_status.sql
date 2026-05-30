UPDATE users
SET business_verification_status = 'NOT_SUBMITTED'
WHERE business_verification_status = 'PENDING'
  AND NOT EXISTS (
    SELECT 1
    FROM jeweller_business_verifications jbv
    WHERE jbv.jeweller_id = users.id
  );
