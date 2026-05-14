import 'reflect-metadata'

export const FILTERS_KEY = Symbol('handler:filters')

export function UseFilters(
  ...filters: (new (...args: any[]) => any)[]
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    propertyKey?: string | symbol,
  ) => {
    const key = propertyKey ?? target
    const existing: (new (...args: any[]) => any)[] =
      Reflect.getMetadata(FILTERS_KEY, target, key) ?? []

    Reflect.defineMetadata(FILTERS_KEY, [...existing, ...filters], target, key)
  }
}
