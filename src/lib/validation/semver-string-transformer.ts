import { z, ZodEffects, ZodString } from 'zod'
import semver, { SemVer } from 'semver'

const semVerTransformOptionsSchema = z
  .object({
    allowBuild: z.boolean().optional().default(true),
    allowPrerelease: z.boolean().optional().default(true)
  })
  .default({
    allowBuild: true,
    allowPrerelease: true
  })

function semverTransformer(
  options?: z.input<typeof semVerTransformOptionsSchema>
): (version: string, context: z.RefinementCtx) => SemVer {
  const { allowBuild, allowPrerelease } = semVerTransformOptionsSchema.parse(options)

  return function (version: string, context: z.RefinementCtx): SemVer {
    const parsed = semver.parse(version)
    if (parsed === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Not a valid SemVer'
      })
      return z.NEVER
    }

    if (!allowBuild && parsed.build.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Build metadata not allowed'
      })
      return z.NEVER
    }

    if (!allowPrerelease && parsed.prerelease.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Prerelease versions not allowed'
      })
      return z.NEVER
    }

    return parsed
  }
}

declare module 'zod' {
  interface ZodString {
    semVer(options?: z.input<typeof semVerTransformOptionsSchema>): ZodEffects<z.ZodString, SemVer, string>
  }
}

ZodString.prototype.semVer = function (
  options?: z.input<typeof semVerTransformOptionsSchema>
): ZodEffects<z.ZodString, SemVer, string> {
  return this.transform(semverTransformer(options))
}
