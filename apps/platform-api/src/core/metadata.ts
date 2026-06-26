import 'reflect-metadata'

export function getCompatibleMetadata<T>(
  metadataKey: symbol,
  target: object,
  propertyKey?: string | symbol,
): T | undefined {
  const direct = propertyKey === undefined
    ? Reflect.getMetadata(metadataKey, target)
    : Reflect.getMetadata(metadataKey, target, propertyKey)

  if (direct !== undefined) {
    return direct as T
  }

  const description = metadataKey.description
  if (!description) {
    return undefined
  }

  const metadataKeys = propertyKey === undefined
    ? Reflect.getMetadataKeys(target)
    : Reflect.getMetadataKeys(target, propertyKey)

  const compatibleKey = metadataKeys.find(
    (key) => typeof key === 'symbol' && key.description === description,
  )

  if (!compatibleKey) {
    return undefined
  }

  return (propertyKey === undefined
    ? Reflect.getMetadata(compatibleKey, target)
    : Reflect.getMetadata(compatibleKey, target, propertyKey)) as T | undefined
}
