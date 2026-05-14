import 'reflect-metadata'

export const GUARDS_KEY = Symbol('handler:guards')

export function UseGuards(
  ...guards: (new (...args: any[]) => any)[]
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    propertyKey?: string | symbol,
  ) => {
    const key = propertyKey ?? target
    const existing: (new (...args: any[]) => any)[] =
      Reflect.getMetadata(GUARDS_KEY, target, key) ?? []

    Reflect.defineMetadata(GUARDS_KEY, [...existing, ...guards], target, key)
  }
}
