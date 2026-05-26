import { apiRequest } from "@/services/httpClient";

export function getLiveGoldPrice() {
  return apiRequest("/gold/live-price");
}
