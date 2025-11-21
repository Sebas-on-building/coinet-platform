/**
 * Fetch JSON Utility
 * 
 * A wrapper around the fetch API that handles JSON parsing and includes
 * error handling for common HTTP responses.
 */

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch JSON data with error handling
 * @param url The URL to fetch from
 * @param options Fetch options (including timeout)
 * @returns Parsed JSON response
 */
export async function fetchJson<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  // Set default headers for JSON requests/responses
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...fetchOptions.headers
  };

  // Create a promise that will reject after the timeout period
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout);
  });

  // Execute the fetch with timeout race
  try {
    const fetchPromise = fetch(url, {
      ...fetchOptions,
      headers
    });

    // Race between the fetch and the timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    // Handle HTTP errors
    if (!response.ok) {
      let errorData;

      try {
        // Try to parse error response as JSON
        errorData = await response.json();
      } catch (e) {
        // If it's not JSON, use the status text
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      // If we have structured error data, use it
      if (errorData && errorData.error) {
        throw new Error(`HTTP error ${response.status}: ${errorData.error}`);
      }

      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    // Check if the response is 204 No Content
    if (response.status === 204) {
      return null as unknown as T;
    }

    // Parse and return the JSON response
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Network error: ${error}`);
  }
}

/**
 * POST JSON data to an API endpoint
 * @param url The URL to post to
 * @param data The data to send
 * @param options Additional fetch options
 * @returns Parsed JSON response
 */
export async function postJson<T = any, D = any>(
  url: string,
  data: D,
  options: FetchOptions = {}
): Promise<T> {
  return fetchJson<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * PUT JSON data to an API endpoint
 * @param url The URL to put to
 * @param data The data to send
 * @param options Additional fetch options
 * @returns Parsed JSON response
 */
export async function putJson<T = any, D = any>(
  url: string,
  data: D,
  options: FetchOptions = {}
): Promise<T> {
  return fetchJson<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * DELETE request to an API endpoint
 * @param url The URL to delete
 * @param options Additional fetch options
 * @returns Parsed JSON response or null
 */
export async function deleteJson<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T | null> {
  return fetchJson<T>(url, {
    method: 'DELETE',
    ...options
  });
} 