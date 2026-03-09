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
        element_type: { type: 'string', enum: ['box', 'text', 'image', 'button', 'input', 'textarea', 'select', 'link'], description: 'Type of element to add. For images, set src in properties — supports PNG, JPG, SVG, WebP, GIF, and any external URL (auto-downloaded to local assets). Use real images/SVG icons instead of emoji characters. Use placeholder services like https://placehold.co/600x400 for mockups.' },
        properties: {
          type: 'object',
          description: 'Optional initial properties to set on the new element. Can include "id" to assign a custom ID (useful in batch_update to reference the frame in subsequent operations).',
          additionalProperties: true,
        },
        classes: {
          type: 'string',
          description: 'Tailwind classes to apply. Example: "flex gap-4 p-8 bg-blue-500 rounded-lg". Parsed into frame properties. Explicit properties override parsed classes.',
        },
        index: {
          type: 'number',
          description: 'Position index within the parent. If omitted, appends at the end.',
        },
      },
      required: ['parent_id', 'element_type'],
    },
  },

  update_frame: {
    name: 'update_frame',
    description: 'Update properties of an existing frame. When a responsive breakpoint is active (via set_breakpoint), writes go to that breakpoint\'s overrides instead of the base frame.\n\nSettable properties by category:\n\nBooleans: wrap, disabled, hidden, checked.\nEnums: display ("flex"|"inline-flex"|"grid"), direction ("row"|"column"|"row-reverse"|"column-reverse"), justify, align, overflow, boxShadow, cursor, fontStyle, textDecoration, textAlign, textAlignVertical ("start"|"center"|"end"), textTransform, whiteSpace, alignSelf, objectFit, inputType, border.style, position ("static"|"relative"|"absolute"|"fixed"|"sticky"), bgSize ("auto"|"cover"|"contain"), bgPosition ("center"|"top"|"bottom"|"left"|"right"|"top-left"|"top-right"|"bottom-left"|"bottom-right"), bgRepeat ("repeat"|"no-repeat"|"repeat-x"|"repeat-y"), transition ("none"|"all"|"colors"|"opacity"|"shadow"|"transform"), ease ("linear"|"in"|"out"|"in-out"), transformOrigin ("center"|"top"|"top-right"|"right"|"bottom-right"|"bottom"|"bottom-left"|"left"|"top-left").\nScale (DesignValue<number>): gap, fontSize, fontWeight, lineHeight, letterSpacing, opacity, grow, shrink, minWidth, maxWidth, minHeight, maxHeight, padding.*, margin.*, inset.*, border.top, border.right, border.bottom, border.left (per-side width), borderRadius.*, zIndex, gridCols, gridRows, colSpan, rowSpan, rotate, scaleVal, translateX, translateY, skewX, skewY, duration, blur, backdropBlur.\nColors (DesignValue<string>): bg, color, border.color.\nText: content, placeholder, src, alt, href, className, htmlId, tailwindClasses, tag, options, rows, bgImage, inputName, inputValue.\nNumbers: min, max, step, defaultValue.\nResponsive: You can also pass responsive overrides directly as properties.responsive: { md: { gap: 8 }, sm: { hidden: true } }. Per-breakpoint objects are deep-merged with existing overrides. However, prefer using set_breakpoint + normal update calls for a cleaner workflow.\n[Experimental] fontFamily: Google Font name string (e.g. "Playfair Display", "Roboto Mono"). Loads the font automatically.\n\nNumeric and color fields accept either a raw value (number/string) or a DesignValue object: { mode: "custom", value: N } or { mode: "token", token: "4", value: 16 }. Raw values are auto-wrapped with token matching.',
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
    description: 'Update padding, margin, or inset of a frame. When a responsive breakpoint is active (via set_breakpoint), writes go to that breakpoint\'s overrides. Values: { top, right, bottom, left }. Each side accepts a number (pixels) or a DesignValue object: { mode: "token", token: "4", value: 16 }. Inset controls top/right/bottom/left offsets for positioned elements.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame' },
        field: { type: 'string', enum: ['padding', 'margin', 'inset'], description: 'Which spacing to update' },
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
    description: 'Update width or height of a frame. When a responsive breakpoint is active (via set_breakpoint), writes go to that breakpoint\'s overrides. Mode can be: default, hug, fill, or fixed. Value accepts a number (pixels) or a DesignValue object: { mode: "token", token: "64", value: 256 }.',
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
  // --- Component tools (primary names) ---
  list_components: {
    name: 'list_components',
    description: 'List available components (reusable frame trees). Returns lightweight metadata without frame data. Filter by tag optionally.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tag: { type: 'string', description: 'Optional tag to filter by (e.g. "layout", "form", "content")' },
      },
    },
  },

  insert_component: {
    name: 'insert_component',
    description: 'Insert a component into the tree. Clones the component frame with new IDs and adds it as a child of parent_id. Use overrides to customize cloned children by name (e.g. set content, classes) without extra update calls.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        component_id: { type: 'string', description: 'ID of the component to insert' },
        parent_id: { type: 'string', description: 'ID of the parent box to insert into' },
        index: { type: 'number', description: 'Position index within the parent. If omitted, appends at the end.' },
        overrides: {
          type: 'object',
          description: 'Map of frame name → patch. Each patch can have "properties" (object) and/or "classes" (Tailwind string). Matches children by name in the cloned tree. Example: { "price": { "properties": { "content": "$49" } }, "cta": { "classes": "bg-violet-600" } }',
          additionalProperties: {
            type: 'object',
            properties: {
              properties: { type: 'object', additionalProperties: true },
              classes: { type: 'string' },
            },
          },
        },
      },
      required: ['component_id', 'parent_id'],
    },
  },

  save_component: {
    name: 'save_component',
    description: 'Save an existing frame from the tree as a reusable component.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        frame_id: { type: 'string', description: 'ID of the frame to save as component' },
        name: { type: 'string', description: 'Name for the component' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags (e.g. ["layout", "form"])',
        },
      },
      required: ['frame_id', 'name'],
    },
  },

  delete_component: {
    name: 'delete_component',
    description: 'Delete a user-created component.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        component_id: { type: 'string', description: 'ID of the component to delete' },
      },
      required: ['component_id'],
    },
  },

  edit_component: {
    name: 'edit_component',
    description: 'Enter component edit mode. Switches the canvas to show the component in isolation for editing. Use update_frame, add_frame, etc. to modify it, then call exit_component_edit when done.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        component_id: { type: 'string', description: 'ID of the component to edit' },
      },
      required: ['component_id'],
    },
  },

  exit_component_edit: {
    name: 'exit_component_edit',
    description: 'Exit component edit mode. Returns to the previous page and auto-propagates changes to all instances of the component.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  new_file: {
    name: 'new_file',
    description: 'Reset the project to a blank state (equivalent to File > New). Clears all pages, frames, and internal components.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  list_pages: {
    name: 'list_pages',
    description: 'List all pages in the project. Returns page id, name, route, and whether it is active.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  switch_page: {
    name: 'switch_page',
    description: 'Switch to a different page. The canvas and tree will show the new page. Returns the page info and a summary tree of the new page, so no follow-up get_tree call is needed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the page to switch to' },
      },
      required: ['id'],
    },
  },

  add_page: {
    name: 'add_page',
    description: 'Add a new empty page. Automatically switches to the new page.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Page name (e.g. "About", "Contact"). Defaults to "Page N".' },
        route: { type: 'string', description: 'Page route (e.g. "/about"). Auto-generated from name if omitted.' },
      },
    },
  },

  remove_page: {
    name: 'remove_page',
    description: 'Remove a page. Cannot remove the last remaining page.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the page to remove' },
      },
      required: ['id'],
    },
  },

  // --- Library tools ---
  export_library: {
    name: 'export_library',
    description: 'Package all internal components into a .cjl file via save dialog. Returns the file path and component count.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name for the library (e.g. "My Components")' },
        author: { type: 'string', description: 'Optional author name' },
        description: { type: 'string', description: 'Optional description' },
        version: { type: 'string', description: 'Optional version string (e.g. "1.0.0")' },
      },
      required: ['name'],
    },
  },
  upload_asset: {
    name: 'upload_asset',
    description: 'Download an external image URL (PNG, JPG, SVG, WebP, GIF) to local storage and return a local asset path. Supports SVG icons and illustrations. The returned localPath can be used as the `src` property for image frames or bgImage for backgrounds. Note: add_frame with element_type "image" auto-downloads external URLs, so this tool is only needed when you want to pre-download assets or use them as backgrounds.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The external image URL to download (must be http:// or https://)' },
      },
      required: ['url'],
    },
  },

  // --- Responsive tools ---
  set_breakpoint: {
    name: 'set_breakpoint',
    description: 'Switch the active responsive breakpoint. Desktop-first: "base" = desktop (default), "md" = tablet (≤768px), "sm" = mobile (≤640px). After switching, ALL update_frame/update_spacing/update_size calls write to that breakpoint\'s overrides instead of the base frame. Only changed properties are stored (sparse overrides). The canvas width is also adjusted to match. Call set_breakpoint({ breakpoint: "base" }) to return to desktop editing when done.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        breakpoint: { type: 'string', enum: ['base', 'md', 'sm'], description: 'The breakpoint to activate. "base" = desktop, "md" = tablet ≤768px, "sm" = mobile ≤640px.' },
      },
      required: ['breakpoint'],
    },
  },

  get_breakpoint: {
    name: 'get_breakpoint',
    description: 'Get the currently active responsive breakpoint and canvas width.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  get_responsive_overrides: {
    name: 'get_responsive_overrides',
    description: 'Get the responsive overrides for a frame. Returns the sparse override objects for each breakpoint (md, sm), or null if no overrides exist. Use this to inspect what properties differ per breakpoint before making changes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame to inspect' },
      },
      required: ['id'],
    },
  },

  clear_responsive_overrides: {
    name: 'clear_responsive_overrides',
    description: 'Clear responsive overrides for a frame at a breakpoint. If keys are provided, only those specific properties are removed. If no keys, all overrides at the breakpoint are cleared.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the frame' },
        breakpoint: { type: 'string', enum: ['md', 'sm'], description: 'The breakpoint to clear overrides for' },
        keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of specific property keys to remove. If omitted, all overrides at the breakpoint are cleared.',
        },
      },
      required: ['id', 'breakpoint'],
    },
  },
} as const

export type ToolName = keyof typeof toolSchemas
