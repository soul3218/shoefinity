const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim();
const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim();
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

export const cloudinaryEnabled = Boolean(cloudName && uploadPreset);

function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read the image file."));
    };
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

async function uploadImageToCloudinary(file: File) {
  if (!cloudinaryEnabled || !cloudName || !uploadPreset) {
    throw new Error("Cloudinary upload is not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Upload failed.");
  }

  return data.secure_url;
}

export async function uploadProductImage(file: File) {
  validateImageFile(file);

  if (cloudinaryEnabled) {
    return {
      url: await uploadImageToCloudinary(file),
      storage: "cloudinary" as const,
    };
  }

  if (file.size > MAX_INLINE_IMAGE_BYTES) {
    throw new Error("Image is too large for inline upload. Configure Cloudinary for bigger files.");
  }

  return {
    url: await readFileAsDataUrl(file),
    storage: "inline" as const,
  };
}
