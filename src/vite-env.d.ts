/// <reference types="vite/client" />

// Allow ?raw imports for CSS files
declare module '*.css?raw' {
  const content: string
  export default content
}

// Allow importing .caja files as JSON
declare module '*.caja' {
  const value: Record<string, unknown>
  export default value
}
