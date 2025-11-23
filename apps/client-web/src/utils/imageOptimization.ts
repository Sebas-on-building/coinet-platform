/**
 * Image Optimization Utilities
 * Provides lazy loading, blur placeholders, and format optimization
 */

// Generate a tiny blur placeholder for images
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return ''
  
  // Create a simple gradient as blur placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#e5e7eb')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL()
}

// Lazy load image with blur effect
export function lazyLoadImage(
  src: string,
  onLoad?: () => void,
  onError?: () => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      onLoad?.()
      resolve(src)
    }
    
    img.onerror = () => {
      onError?.()
      reject(new Error(`Failed to load image: ${src}`))
    }
    
    img.src = src
  })
}

// Preload critical images
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(url => lazyLoadImage(url))
  ).then(() => [])
}

// Get optimal image format based on browser support
export function getOptimalImageFormat(): 'webp' | 'avif' | 'jpg' {
  const canvas = document.createElement('canvas')
  
  // Check WebP support
  if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return 'webp'
  }
  
  // Check AVIF support (limited browser support)
  if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
    return 'avif'
  }
  
  return 'jpg'
}

// Resize image to max dimensions while maintaining aspect ratio
export function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      
      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height
          height = maxHeight
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      }, 'image/jpeg', 0.9)
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    reader.readAsDataURL(file)
  })
}

// Intersection Observer for lazy loading images
export class ImageLazyLoader {
  private observer: IntersectionObserver
  
  constructor(callback?: (entry: IntersectionObserverEntry) => void) {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = img.dataset.src
            
            if (src) {
              img.src = src
              img.removeAttribute('data-src')
              this.observer.unobserve(img)
            }
            
            callback?.(entry)
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    )
  }
  
  observe(element: HTMLElement) {
    this.observer.observe(element)
  }
  
  unobserve(element: HTMLElement) {
    this.observer.unobserve(element)
  }
  
  disconnect() {
    this.observer.disconnect()
  }
}
