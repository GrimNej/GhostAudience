import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";

import {
  GhostAudienceDatabase,
} from "../infrastructure/db/database";

const DatabaseContext =
  createContext<GhostAudienceDatabase | null>(
    null,
  );

export function DatabaseProvider({
  children,
}: PropsWithChildren): JSX.Element {
  const database = useMemo(
    () => new GhostAudienceDatabase(),
    [],
  );

  return (
    <DatabaseContext.Provider value={database}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase():
  GhostAudienceDatabase {
  const database = useContext(DatabaseContext);

  if (database === null) {
    throw new Error(
      "useDatabase must be used within DatabaseProvider.",
    );
  }

  return database;
}