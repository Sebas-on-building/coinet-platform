export const SamplePlugin = {
  name: 'SamplePlugin',
  description: 'A sample plugin for demonstration.',
  onMemoryAlert: (data) => {
    // Custom logic on memory alert
    console.log('Memory alert in plugin:', data);
  }
}; 