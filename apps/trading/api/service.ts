export class ApiService {
  async performAction(payload: unknown): Promise<unknown> {
    // Placeholder for core logic
    console.log("ApiService.performAction called with:", payload);
    return { status: "success", message: "Action performed" };
  }
}
