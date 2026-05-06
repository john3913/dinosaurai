export async function GET() {
  return Response.json({ hasApiKey: !!process.env.ANTHROPIC_API_KEY });
}
