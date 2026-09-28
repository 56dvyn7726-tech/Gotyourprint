/**
 * Zmenší fotku v prohlížeči (na webu výběr obrázku nepodporuje `quality`, takže
 * fotka z mobilu má klidně 8 MB – API přijímá max. 5 MB a větší rozlišení stejně nevyužije).
 */
export async function downscaleInBrowser(
  base64: string,
  mediaType: string,
  maxEdge = 1568,
): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  const img = new window.Image();
  img.src = `data:${mediaType};base64,${base64}`;
  await img.decode();
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg' };
}
