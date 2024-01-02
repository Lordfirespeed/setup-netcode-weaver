import * as core from '@actions/core'

/* eslint-disable @typescript-eslint/no-explicit-any */

export function ActionLogGroupAsync(groupTitle: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const oldFunction = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      core.startGroup(groupTitle)
      try {
        return await oldFunction.apply(target, args)
      } finally {
        core.endGroup()
      }
    }
  }
}

export function ActionLogGroup(groupTitle: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const oldFunction = descriptor.value

    descriptor.value = function (...args: unknown[]) {
      core.startGroup(groupTitle)
      try {
        return oldFunction.apply(target, args)
      } finally {
        core.endGroup()
      }
    }
  }
}
