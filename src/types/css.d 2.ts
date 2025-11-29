// For CSS
declare module "*.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// For SASS/SCSS
declare module "*.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// For LESS
declare module "*.less" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// For stylus
declare module "*.styl" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// This will allow TypeScript to import CSS modules without type errors
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// For Tailwind CSS intellisense
declare module "tailwindcss/plugin" {
  const plugin: any;
  export default plugin;
}
