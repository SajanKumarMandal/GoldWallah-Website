export function mapJewellerVerification(row, { includeAdminFields = false } = {}) {
  if (!row) {
    return null;
  }

  const verification = {
    id: row.id,
    jewellerId: row.jeweller_id,
    shopName: row.shop_name,
    ownerName: row.owner_name,
    businessMobile: row.business_mobile,
    businessEmail: row.business_email,
    gstLast4: row.gst_last4,
    shopLicenseLast4: row.shop_license_last4,
    businessAddress: row.business_address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    shopOpeningTime: row.shop_opening_time,
    shopClosingTime: row.shop_closing_time,
    yearsInBusiness: row.years_in_business,
    businessType: row.business_type,
    shopFrontImageUrl: row.shop_front_image_url,
    gstCertificateImageUrl: row.gst_certificate_image_url,
    shopLicenseImageUrl: row.shop_license_image_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeAdminFields) {
    verification.reviewNotes = row.review_notes;
    verification.reviewedBy = row.reviewed_by;
  }

  return verification;
}

export function mapJewellerVerificationWithEncryptedIdentity(row) {
  if (!row) {
    return null;
  }

  return {
    ...mapJewellerVerification(row, { includeAdminFields: true }),
    gstNumberEncrypted: row.gst_number_encrypted,
    shopLicenseNumberEncrypted: row.shop_license_number_encrypted,
  };
}
