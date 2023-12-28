/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'

// Mock the action's main function
const _runMock = jest.spyOn(main, 'default')

// Mock the GitHub Actions core library
let _debugMock: jest.SpyInstance
let _errorMock: jest.SpyInstance
let _getInputMock: jest.SpyInstance
let _setFailedMock: jest.SpyInstance
let _setOutputMock: jest.SpyInstance

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    _debugMock = jest.spyOn(core, 'debug').mockImplementation()
    _errorMock = jest.spyOn(core, 'error').mockImplementation()
    _getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    _setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    _setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
  })
})
