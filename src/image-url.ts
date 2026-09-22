export default function removeImageSuffix(
  imageUrl: string,
  suffixPattern: RegExp
): string {
  const parsedUrl = new URL(imageUrl);
  const lastSlash = parsedUrl.pathname.lastIndexOf("/");
  const filename = parsedUrl.pathname.slice(lastSlash + 1);
  const extensionIndex = filename.lastIndexOf(".");

  if (extensionIndex <= 0) return imageUrl;

  const basename = filename.slice(0, extensionIndex);
  const extension = filename.slice(extensionIndex);
  const updatedBasename = basename.replace(suffixPattern, "");

  if (updatedBasename === basename) return imageUrl;

  parsedUrl.pathname = `${parsedUrl.pathname.slice(
    0,
    lastSlash + 1
  )}${updatedBasename}${extension}`;
  return parsedUrl.href;
}
