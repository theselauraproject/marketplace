const isInline = (src: string) =>
  src.startsWith("data:") || src.startsWith("blob:");

async function fetchTextureBlob(src: string): Promise<Blob> {
  const options = { mode: "cors", credentials: "omit" } as const;

  let response: Response;

  try {
    response = await fetch(src, { ...options, cache: "reload" });
  } catch {
    response = await fetch(src, { ...options, cache: "force-cache" });
  }

  if (!response.ok) {
    throw new Error(`Failed to load skin texture (${response.status})`);
  }

  return response.blob();
}

export async function toDataUrl(src: string): Promise<string> {
  if (isInline(src)) {
    return src;
  }

  const blob = await fetchTextureBlob(src);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read skin texture"));
    reader.readAsDataURL(blob);
  });
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load skin texture"));
    img.src = src;
  });
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  if (isInline(src)) {
    return decodeImage(src);
  }

  const blob = await fetchTextureBlob(src);
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await decodeImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
