export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#0d5a89"/><stop offset="1" stop-color="#0f9d78"/>' +
      '</linearGradient></defs>' +
      '<rect width="1200" height="800" fill="url(#g)"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" opacity="0.9" font-size="42" font-family="serif">VoxelCAUC</text>' +
    '</svg>'
  );

export function resolveAssetUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { url: '' };
  }

  return { url: rawUrl };
}

export function normalizeModelDefinition(modelValue) {
  if (!modelValue) {
    return { kind: 'unknown', url: '', obj: '', mtl: '', texturePath: '' };
  }

  if (typeof modelValue === 'string') {
    return {
      kind: 'file',
      url: modelValue,
      obj: modelValue,
      mtl: '',
      texturePath: ''
    };
  }

  if (typeof modelValue === 'object') {
    const url = modelValue.url || modelValue.obj || '';
    return {
      kind: modelValue.kind || modelValue.type || 'bundle',
      url,
      obj: modelValue.obj || url,
      mtl: modelValue.mtl || '',
      texturePath: modelValue.texturePath || modelValue.resourcePath || ''
    };
  }

  return { kind: 'unknown', url: '', obj: '', mtl: '', texturePath: '' };
}

export function buildCardResource(building) {
  const imageResult = resolveAssetUrl(building.image);
  const modelDefinition = normalizeModelDefinition(building.model);
  const modelResult = resolveAssetUrl(modelDefinition.url);

  return {
    ...building,
    imageUrl: imageResult.url || PLACEHOLDER_IMAGE,
    modelUrl: modelResult.url,
    modelBundle: modelDefinition
  };
}
