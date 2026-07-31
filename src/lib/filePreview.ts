export const FILE_PREVIEW_EVENT = "bimbelku:file-preview";

export interface FilePreviewDetail {
  url: string;
  filename: string;
  contentType: string;
  release?: () => void;
}

export const showFilePreview = (detail: FilePreviewDetail) => {
  window.dispatchEvent(new CustomEvent<FilePreviewDetail>(FILE_PREVIEW_EVENT, {
    detail,
  }));
};

export const inferContentType = (source: string) => {
  const cleanSource = source.split("?")[0].split("#")[0].toLocaleLowerCase("id-ID");
  if (cleanSource.endsWith(".pdf")) return "application/pdf";
  if (cleanSource.endsWith(".png")) return "image/png";
  if (cleanSource.endsWith(".webp")) return "image/webp";
  if (cleanSource.endsWith(".gif")) return "image/gif";
  if (cleanSource.endsWith(".jpg") || cleanSource.endsWith(".jpeg")) return "image/jpeg";
  return "";
};
