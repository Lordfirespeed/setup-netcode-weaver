import { z, ZodEffects, ZodString } from 'zod'
import { TargetFramework, TargetFrameworkMoniker } from '../target-framework-moniker'

function tfmRegexTransformer(framework: TargetFramework, regex: RegExp) {
  return function (targetFrameworkMoniker: string, context: z.RefinementCtx): TargetFrameworkMoniker {
    const match = regex.exec(targetFrameworkMoniker)
    if (match === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Not a valid ${framework} target framework moniker.`
      })
      return z.NEVER
    }

    if (match.groups === undefined) {
      throw new Error('Invalid target framework moniker regex - missing capture groups.')
    }

    const { version } = match.groups
    if (!version) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Not a valid ${framework} target framework moniker.`
      })
      return z.NEVER
    }

    return TargetFrameworkMoniker.New(framework, targetFrameworkMoniker, version)
  }
}

declare module 'zod' {
  interface ZodString {
    targetFramework(framework: TargetFramework, regex: RegExp): ZodEffects<z.ZodString, TargetFrameworkMoniker, string>
  }
}

ZodString.prototype.targetFramework = function (
  framework: TargetFramework,
  regex: RegExp
): ZodEffects<z.ZodString, TargetFrameworkMoniker, string> {
  return this.transform(tfmRegexTransformer(framework, regex))
}
