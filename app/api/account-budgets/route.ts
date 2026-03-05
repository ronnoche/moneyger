export async function POST(request: Request) {
  void request;
  return Response.json(
    { error: { message: 'Account allocations are retired. Use bucket assignments instead.' } },
    { status: 410 },
  );
}

