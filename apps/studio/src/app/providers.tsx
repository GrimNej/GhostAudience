import { QueryClientProvider } from "@tanstack/react-query";
import {
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { requestPersistentStorage } from "../infrastructure/storage/request-persistence";
import { DatabaseProvider } from "./database-context";
import { ApplicationErrorBoundary } from "./error-boundary";
import { createApplicationQueryClient } from "./query-client";

export function AppProviders({
  children,
}: PropsWithChildren): JSX.Element {
  const [queryClient] = useState(
    createApplicationQueryClient,
  );

  useEffect(() => {
    void requestPersistentStorage().then((result) => {
      if (result.supported && !result.persisted) {
        console.warn(
          "Persistent browser storage was not granted; export important projects regularly.",
        );
      }
    });
  }, []);

  return (
    <ApplicationErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DatabaseProvider>{children}</DatabaseProvider>
      </QueryClientProvider>
    </ApplicationErrorBoundary>
  );
}