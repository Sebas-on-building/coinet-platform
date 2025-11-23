/**
 * Tailwind CSS Debug Utility
 *
 * This utility helps identify unknown Tailwind CSS utility classes in your application.
 * It provides a function that can be used in development to log unknown classes to the console.
 */

/**
 * Checks if a Tailwind CSS class is recognized in the compiled CSS
 * @param {string} className - The class name to check
 * @returns {boolean} - Whether the class is recognized
 */
export function isClassRecognized(className) {
  // In a browser environment
  if (typeof document !== "undefined") {
    // Get all stylesheets
    const styleSheets = document.styleSheets;

    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const styleSheet = styleSheets[i];
        const rules = styleSheet.cssRules || styleSheet.rules;

        if (!rules) continue;

        // Check if the class exists in any of the rules
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (
            rule.selectorText &&
            rule.selectorText.includes(`.${className}`)
          ) {
            return true;
          }
        }
      } catch (e) {
        // Skip stylesheet if it can't be accessed (e.g., CORS)
        continue;
      }
    }

    return false;
  }

  // In a non-browser environment
  return true; // Can't check, assume it's recognized
}

/**
 * Logs unrecognized Tailwind CSS classes to the console
 * @param {string} classNames - Space-separated class names to check
 * @returns {string[]} - Array of unrecognized class names
 */
export function debugTailwindClasses(classNames) {
  const classArray = classNames.split(" ").filter(Boolean);
  const unrecognizedClasses = [];

  classArray.forEach((className) => {
    if (!isClassRecognized(className)) {
      unrecognizedClasses.push(className);
      console.warn(`[Tailwind Debug] Unrecognized utility class: ${className}`);
    }
  });

  return unrecognizedClasses;
}

/**
 * HOC to debug Tailwind CSS classes in a component
 * @param {React.Component} Component - React component
 * @returns {React.Component} - Wrapped component with debug functionality
 */
export function withTailwindDebug(Component) {
  return function DebugComponent(props) {
    // In development only
    if (process.env.NODE_ENV === "development") {
      const originalClassName = props.className || "";
      debugTailwindClasses(originalClassName);
    }

    return <Component {...props} />;
  };
}
