// JSON Schema definitions for MCP tools
// These are used both for MCP tool registration and for validation

export const toolSchemas = {
  add_frame: {
    name: 'add_frame',
    description: 'Add a new frame (box) or text element as a child of the given parent.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        parent_id: { type: 'string', description: 'ID of the parent box to add into' },
        element_type: { type: 'string', enum: ['box', 'text', 'image', 'button', 'input', 'textarea', 'select', 'link'], description: 'Type of element to add' },
        properties: {
          type: 'object',
          description: 'Optional initial properties to set on the new element. Can include "id" to assign a custom ID (useful in batch_update to reference the frame in subsequent operations).',
          additionalProperties: true,
        },
        classes: {
          type: 'string',
          description: 'Tailwind classes to apply. Example: "flex gap-4 p-8 bg-blue-500 rounded-lg". Parsed into frame properties. Explicit properties override parsed classes.',
        },
      },
      required: ['parent_id', 'element_type'],
    },
  },

  update_frame: {
    name: 'update_frame',
    description: 'Update properties of an existing frame. Settable properties by category:\n\nBooleans: wrap, disabled, hidden.\nEnums: display ("flex"|"inline-flex"|"block"|"inline-block"|"inline"), direction ("row"|"column"), justify, align, overflow, boxShadow, cursor, fontStyle, textDecoration, textAlign, textTransform, whiteSpace, alignSelf, objectFit, inputType, border.style.\nScale (DesignValue<number>): gap, fontSize, fontWeight, lineHeight, letterSpacing, opacity, grow, shrink, minWidth, maxWidth, minHeight, maxHeight, padding.*, margin.*, border.width, borderRadius.*.\nColors (DesignValue<string>): bg, color, border.color.\nText: content, placeholder, src, alt, href, className, htmlId, tailwindClasses, tag, options, rows.\n[Experimental] fontFamily: Google Font name string (e.g. "Playfair Display", "Roboto Mono"). Loads the font automatically.\n\nNumeric and color fields accept either a raw value (number/string) or a DesignValue object: { mode: "custom", value: N } or { mode: "token", token: "4", value: 16 }. Raw values are auto-wrapped with token matching.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame to update' },
        properties: {
          type: 'object',
          description: 'Properties to set (partial update)',
          additionalProperties: true,
        },
        classes: {
          type: 'string',
          description: 'Tailwind classes to apply. Example: "flex gap-4 p-8 bg-blue-500 rounded-lg". Parsed into frame properties. Explicit properties override parsed classes.',
        },
      },
      required: ['id'],
    },
  },

  update_spacing: {
    name: 'update_spacing',
    description: 'Update padding or margin of a frame. Values: { top, right, bottom, left }. Each side accepts a number (pixels) or a DesignValue object: { mode: "token", token: "4", value: 16 }.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame' },
        field: { type: 'string', enum: ['padding', 'margin'], description: 'Which spacing to update' },
        values: {
          type: 'object',
          properties: {
            top: { type: 'number' },
            right: { type: 'number' },
            bottom: { type: 'number' },
            left: { type: 'number' },
          },
          description: 'Partial spacing values to merge',
        },
      },
      required: ['id', 'field', 'values'],
    },
  },

  update_size: {
    name: 'update_size',
    description: 'Update width or height of a frame. Mode can be: default, hug, fill, or fixed. Value accepts a number (pixels) or a DesignValue object: { mode: "token", token: "64", value: 256 }.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame' },
        dimension: { type: 'string', enum: ['width', 'height'], description: 'Which dimension to update' },
        size: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['default', 'hug', 'fill', 'fixed'] },
            value: { type: 'number', description: 'Pixel value (only used when mode is fixed)' },
          },
          description: 'Size configuration',
        },
      },
      required: ['id', 'dimension', 'size'],
    },
  },

  remove_frame: {
    name: 'remove_frame',
    description: 'Delete a frame from the tree. Cannot delete the root.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame to remove' },
      },
      required: ['id'],
    },
  },

  move_frame: {
    name: 'move_frame',
    description: 'Move a frame to a new parent at a specific index.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame to move' },
        new_parent_id: { type: 'string', description: 'ID of the new parent box' },
        index: { type: 'number', description: 'Position index within the new parent' },
      },
      required: ['id', 'new_parent_id', 'index'],
    },
  },

  wrap_frame: {
    name: 'wrap_frame',
    description: 'Wrap a frame in a new parent box element.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame to wrap' },
      },
      required: ['id'],
    },
  },

  duplicate_frame: {
    name: 'duplicate_frame',
    description: 'Duplicate a frame (deep clone with new IDs), placed next to the original.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame to duplicate' },
      },
      required: ['id'],
    },
  },

  rename_frame: {
    name: 'rename_frame',
    description: 'Rename a frame.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame' },
        name: { type: 'string', description: 'New name' },
      },
      required: ['id', 'name'],
    },
  },

  select_frame: {
    name: 'select_frame',
    description: 'Select a frame in the UI (highlights it in the tree and canvas).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame to select, or null to deselect' },
      },
      required: ['id'],
    },
  },

  get_tree: {
    name: 'get_tree',
    description: 'Read the full frame tree. Returns the complete layout structure as JSON. Use summary=true for a lightweight tree (~5KB vs 241KB) with only id, type, name, content, display, and children — ideal for LLM context.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        summary: { type: 'boolean', description: 'When true, return a compact tree with only structural info (id, type, name, content, display, childCount). Default false.' },
      },
    },
  },

  get_selected: {
    name: 'get_selected',
    description: 'Get the currently selected frame, or null if nothing is selected.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  screenshot: {
    name: 'screenshot',
    description: 'Take a screenshot of the canvas. Returns a base64-encoded PNG image. Selection outlines are temporarily hidden.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  batch_update: {
    name: 'batch_update',
    description: 'Execute multiple operations in a single undo step. Use for coherent multi-frame changes. Supports variable substitution: use "$prev" to reference the previous operation\'s result ID, or "$0", "$1", "$N" for the Nth operation\'s result ID (zero-indexed). This lets you create a frame and immediately use it as a parent: [add_frame(...), add_frame({ parent_id: "$prev" })].',
    inputSchema: {
      type: 'object' as const,
      properties: {
        operations: {
          type: 'array',
          description: 'Array of tool calls to execute sequentially. String values "$prev" and "$N" are replaced with result IDs from earlier operations.',
          items: {
            type: 'object',
            properties: {
              tool: { type: 'string', description: 'Tool name' },
              params: { type: 'object', description: 'Tool parameters', additionalProperties: true },
            },
            required: ['tool', 'params'],
          },
        },
      },
      required: ['operations'],
    },
  },
} as const

export type ToolName = keyof typeof toolSchemas
