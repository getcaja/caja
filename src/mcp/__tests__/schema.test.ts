import { describe, it, expect } from 'vitest'
import { toolSchemas, type ToolName } from '../schema'

describe('MCP schema', () => {
  describe('component tools exist (primary names)', () => {
    const componentTools: ToolName[] = [
      'list_components', 'insert_component', 'save_component', 'delete_component',
    ]

    for (const name of componentTools) {
      it(`has ${name} schema`, () => {
        expect(toolSchemas[name]).toBeDefined()
        expect(toolSchemas[name].name).toBe(name)
        expect(toolSchemas[name].inputSchema).toBeDefined()
      })
    }
  })

  describe('library tools exist', () => {
    it('has list_libraries schema', () => {
      expect(toolSchemas.list_libraries).toBeDefined()
      expect(toolSchemas.list_libraries.name).toBe('list_libraries')
    })

    it('has list_library_components schema', () => {
      expect(toolSchemas.list_library_components).toBeDefined()
      expect(toolSchemas.list_library_components.name).toBe('list_library_components')
      expect(toolSchemas.list_library_components.inputSchema.required).toContain('library_id')
    })
  })

  describe('insert_component includes library_id param', () => {
    it('has library_id in properties', () => {
      const props = toolSchemas.insert_component.inputSchema.properties
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
