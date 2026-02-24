import { describe, it, expect } from 'vitest'
import { toolSchemas, type ToolName } from '../schema'

describe('MCP schema', () => {
  describe('pattern tools exist', () => {
    const patternTools: ToolName[] = [
      'list_patterns', 'insert_pattern', 'save_pattern', 'delete_pattern',
    ]

    for (const name of patternTools) {
      it(`has ${name} schema`, () => {
        expect(toolSchemas[name]).toBeDefined()
        expect(toolSchemas[name].name).toBe(name)
        expect(toolSchemas[name].inputSchema).toBeDefined()
      })
    }
  })

  describe('snippet aliases exist (backward compat)', () => {
    const snippetTools: ToolName[] = [
      'list_snippets', 'insert_snippet', 'save_snippet', 'delete_snippet',
    ]

    for (const name of snippetTools) {
      it(`has ${name} alias schema`, () => {
        expect(toolSchemas[name]).toBeDefined()
        expect(toolSchemas[name].name).toBe(name)
        expect(toolSchemas[name].description).toContain('Alias')
      })
    }
  })

  describe('library tools exist', () => {
    it('has list_libraries schema', () => {
      expect(toolSchemas.list_libraries).toBeDefined()
      expect(toolSchemas.list_libraries.name).toBe('list_libraries')
    })

    it('has list_library_patterns schema', () => {
      expect(toolSchemas.list_library_patterns).toBeDefined()
      expect(toolSchemas.list_library_patterns.name).toBe('list_library_patterns')
      expect(toolSchemas.list_library_patterns.inputSchema.required).toContain('library_id')
    })
  })

  describe('insert_pattern includes library_id param', () => {
    it('has library_id in properties', () => {
      const props = toolSchemas.insert_pattern.inputSchema.properties
      expect(props.library_id).toBeDefined()
      expect(props.library_id.type).toBe('string')
    })
  })

  describe('all schemas have valid structure', () => {
    const allToolNames = Object.keys(toolSchemas) as ToolName[]

    for (const name of allToolNames) {
      it(`${name} has name, description, and inputSchema`, () => {
        const schema = toolSchemas[name]
        expect(schema.name).toBe(name)
        expect(typeof schema.description).toBe('string')
        expect(schema.inputSchema).toBeDefined()
        expect(schema.inputSchema.type).toBe('object')
      })
    }
  })
})
