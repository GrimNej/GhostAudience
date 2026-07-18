import { registerSW } from "virtual:pwa-register";

export interface ServiceWorkerUpdateHooks {
  readonly onUpdateAvailable: (applyUpdate: () => Promise<void>) => void;
  readonly onOfflineReady: () => void;
  readonly onRegistrationError: (error: Error) => void;
}

export function registerApplicationServiceWorker(
  hooks: ServiceWorkerUpdateHooks,
): () => void {
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      hooks.onUpdateAvailable(async () => {
        await update(true);
      });
    },
    onOfflineReady() {
      hooks.onOfflineReady();
    },
    onRegisterError(error: unknown) {
      hooks.onRegistrationError(
        error instanceof Error
          ? error
          : new Error("Service-worker registration failed."),
      );
    },
  });

  return () => {
    // vite-plugin-pwa does not expose an unsubscribe
    // function here. This return keeps the application
    // adapter interface stable.
  };
}
