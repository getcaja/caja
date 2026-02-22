/// <reference types="vite/client" />

// Allow ?raw imports for CSS files
declare module '*.css?raw' {
  const content: string
  export default content
}
