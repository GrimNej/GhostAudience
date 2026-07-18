export function downloadTextFile(
  fileName: string,
  content: string,
  mediaType: string,
): void {
  const blob = new Blob([content], {
    type: `${mediaType};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    anchor.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}