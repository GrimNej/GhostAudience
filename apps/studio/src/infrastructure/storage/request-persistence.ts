export interface PersistenceResult {
  readonly supported: boolean;
  readonly persisted: boolean;
}

export async function requestPersistentStorage(): Promise<PersistenceResult> {
  if (navigator.storage?.persist === undefined) {
    return { supported: false, persisted: false };
  }
  const alreadyPersisted =
    (await navigator.storage.persisted?.()) ?? false;
  if (alreadyPersisted) {
    return { supported: true, persisted: true };
  }
  return {
    supported: true,
    persisted: await navigator.storage.persist(),
  };
}