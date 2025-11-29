export class LlmService {
  async performAction(payload: unknown): Promise<unknown> {
    // Placeholder for core logic
    console.log("LlmService.performAction called with:", payload);
    return { status: "success", message: "Action performed" };
  }
}
