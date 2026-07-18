import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "../../../infrastructure/network/api-client";

const client = new ApiClient();

export function useCapabilities() {
  return useQuery({
    queryKey: ["gateway-capabilities"],
    queryFn: ({ signal }) => client.capabilities(signal),
    staleTime: 60_000,
    retry: false,
  });
}
