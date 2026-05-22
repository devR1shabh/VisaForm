const sharp = require("sharp");

async function buildPassportImages(imageBuffer) {
  const normalized = await sharp(imageBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: 1800,
      height: 1200,
      fit: "inside",
      withoutEnlargement: false,
    })
    .grayscale()
    .sharpen()
    .normalize()
    .jpeg({ quality: 92 })
    .toBuffer();

  const metadata = await sharp(normalized).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const extractBottom = async (topRatio, heightRatio) => {
    if (!width || !height) return normalized;

    const top = Math.max(0, Math.floor(height * topRatio));
    const cropHeight = Math.max(
      1,
      Math.min(height - top, Math.floor(height * heightRatio))
    );

    return sharp(normalized)
      .extract({
        left: 0,
        top,
        width,
        height: cropHeight,
      })
      .resize({
        width: 1800,
        fit: "inside",
        withoutEnlargement: false,
      })
      .sharpen()
      .normalize()
      .jpeg({ quality: 95 })
      .toBuffer();
  };

  const rotatedFullImages = await Promise.all(
    [90, 180, 270].map((angle) =>
      sharp(normalized)
        .rotate(angle)
        .jpeg({ quality: 92 })
        .toBuffer()
    )
  );

  return {
    fullImage: normalized,
    mrzImage: await extractBottom(0.58, 0.42),
    lowerMrzImage: await extractBottom(0.68, 0.32),
    rotatedFullImages,
  };
}

module.exports = {
  buildPassportImages,
};
