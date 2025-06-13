export const isObject = (value: any): value is object => {
  return !!value && value.constructor === Object
}

/**
 * Merges two objects together recursivly into a new
 * object applying values from right to left.
 * Recursion only applies to child object properties.
 */
export const assign = <X extends Record<string | symbol | number, any>>(
  initial: X,
  override: X
): X => {
  if (!initial || !override) return initial ?? override ?? {}

  return Object.entries({ ...initial, ...override }).reduce(
    (acc, [key, value]) => {
      return {
        ...acc,
        [key]: (() => {
          if (isObject(initial[key])) return assign(initial[key], value)
          // if (isArray(value)) return value.map(x => assign)
          return value
        })()
      }
    },
    {} as X
  )
}
