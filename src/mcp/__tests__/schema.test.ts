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

  describe('export_library tool exists', () => {
    it('has export_library schema', () => {
      expect(toolSchemas.export_library).toBeDefined()
      expect(toolSchemas.export_library.name).toBe('export_library')
      expect(toolSchemas.export_library.inputSchema.required).toContain('name')
    })
  })

  describe('insert_component does not have library_id param', () => {
    it('has no library_id in properties', () => {
      const props = toolSchemas.insert_component.inputSchema.properties
      expect(props).not.toHaveProperty('library_id')
    })
  })

  describe('library tools removed', () => {
    it('does not have list_libraries', () => {
      expect(toolSchemas).not.toHaveProperty('list_libraries')
    })

    it('does not have list_library_components', () => {
      expect(toolSchemas).not.toHaveProperty('list_library_components')
    })

    it('does not have install_library', () => {
      expect(toolSchemas).not.toHaveProperty('install_library')
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
