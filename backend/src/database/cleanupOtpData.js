import { query } from "../config/db.js";

const otpRetentionDays = Number.parseInt(process.env.OTP_CODE_RETENTION_DAYS || "7", 10);
const eventRetentionDays = Number.parseInt(process.env.OTP_EVENT_RETENTION_DAYS || "90", 10);

function positiveDays(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function main() {
  const otpDays = positiveDays(otpRetentionDays, 7);
  const eventDays = positiveDays(eventRetentionDays, 90);

  const expiredOtpResult = await query(
    `DELETE FROM otp_codes
     WHERE expires_at < now() - ($1::int * interval '1 day')
       AND (
         consumed_at IS NOT NULL
         OR delivery_status IN ('FAILED', 'CONSUMED')
       )`,
    [otpDays],
  );

  const oldEventsResult = await query(
    `DELETE FROM otp_security_events
     WHERE created_at < now() - ($1::int * interval '1 day')`,
    [eventDays],
  );

  console.log(
    JSON.stringify({
      success: true,
      deletedOtpRows: expiredOtpResult.rowCount || 0,
      deletedOtpSecurityEventRows: oldEventsResult.rowCount || 0,
      otpRetentionDays: otpDays,
      eventRetentionDays: eventDays,
    }),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      success: false,
      message: "OTP cleanup failed",
      error: error.message,
    }),
  );
  process.exitCode = 1;
});
