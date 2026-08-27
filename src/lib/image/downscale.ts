/**
 * The longest edge a photo is shrunk to before it is uploaded.
 *
 * A phone camera produces something like 4000×3000 and 6 MB. A vision model
 * reads a menu perfectly well at 1280, and the difference is the wait between
 * pressing the shutter and seeing what the model read.
 */
export const maxImageEdge = 1280;

export const jpegQuality = 0.82;

/** The size an image becomes when its longest edge is capped at `max`. */
export const fitWithin = (
  width: number,
  height: number,
  max: number = maxImageEdge,
): { width: number; height: number } => {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

/**
 * Shrink a photo the learner picked and return it as a `data:` URL.
 *
 * Browser-side, because the alternative is uploading the original: on a phone
 * that is several megabytes over a mobile connection before anything has
 * happened, and the server would only throw it away.
 */
export const downscaleImage = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot process images.");
    context.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", jpegQuality);
  } finally {
    bitmap.close();
  }
};
